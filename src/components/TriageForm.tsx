import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, CheckCircle, Clock } from 'lucide-react';

interface TriageFormProps {
  patient: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}

interface TriageAnswers {
  swallow_multiple_times: number;
  effort_to_swallow: number;
  pain_swallowing: number;
  weight_loss_difficulty: number;
  throat_clearing: number;
  voice_changes: number;
  choking_after_swallow: number;
  pneumonia_after_choking: number;
  fatigue_after_eating: number;
}

const TriageForm: React.FC<TriageFormProps> = ({ patient, onComplete, onBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Partial<TriageAnswers>>({});
  const { toast } = useToast();

  // All 9 RaDI questions
  const allQuestions = [
    { key: 'swallow_multiple_times', label: 'Precisa engolir muitas vezes o alimento para fazê-lo descer?' },
    { key: 'effort_to_swallow', label: 'Faz esforço para engolir?' },
    { key: 'pain_swallowing', label: 'Sente dor ao engolir?' },
    { key: 'weight_loss_difficulty', label: 'Perdeu peso por ter dificuldade de engolir?' },
    { key: 'throat_clearing', label: 'Tem pigarro depois de engolir?' },
    { key: 'voice_changes', label: 'Sua voz modifica depois de engolir?' },
    { key: 'choking_after_swallow', label: 'Tem engasgo depois de engolir?' },
    { key: 'pneumonia_after_choking', label: 'Teve pneumonia depois de algum engasgo?' },
    { key: 'fatigue_after_eating', label: 'Sente cansaço depois de comer?' }
  ];

  const totalQuestions = allQuestions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswerChange = (questionKey: string, value: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  const calculateRiskScore = () => {
    let score = 0;
    Object.values(answers).forEach(answer => {
      if (typeof answer === 'number' && answer === 1) { // 1 = Sim
        score += 1;
      }
    });
    return score;
  };

  const getRiskLevel = (score: number) => {
    if (score === 0) {
      return { 
        level: 'baixo', 
        label: 'Sem Sintomas', 
        color: 'text-green-600',
        description: 'Nenhum sintoma identificado no momento da avaliação'
      };
    } else if (score >= 1 && score <= 3) {
      return { 
        level: 'medio', 
        label: 'Risco Moderado', 
        color: 'text-yellow-600',
        description: 'Alguns sintomas identificados. Recomenda-se acompanhamento'
      };
    } else {
      return { 
        level: 'alto', 
        label: 'Risco Alto', 
        color: 'text-red-600',
        description: 'Múltiplos sintomas identificados. Recomenda-se avaliação especializada urgente'
      };
    }
  };

  const handleNext = () => {
    const currentQuestion = allQuestions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.key as keyof TriageAnswers];
    
    if (currentAnswer === undefined) {
      toast({
        title: "Resposta obrigatória",
        description: "Por favor, responda a pergunta antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const totalScore = calculateRiskScore();
      const riskLevel = getRiskLevel(totalScore);

      // Save triage assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('triage_assessments')
        .insert({
          patient_id: patient.id,
          caregiver_id: (await supabase.auth.getUser()).data.user?.id,
          total_score: totalScore,
          risk_level: riskLevel.level as 'baixo' | 'medio' | 'alto',
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Save individual answers
      const answersToSave = Object.entries(answers)
        .filter(([key, value]) => typeof value === 'number')
        .map(([questionId, answerValue]) => ({
          assessment_id: assessment.id,
          question_id: questionId,
          answer_value: answerValue as number
        }));

      if (answersToSave.length > 0) {
        const { error: answersError } = await supabase
          .from('triage_answers')
          .insert(answersToSave);

        if (answersError) throw answersError;
      }

      toast({
        title: "RaDI Concluído",
        description: `Avaliação realizada com sucesso. Status: ${riskLevel.label}`,
      });

      onComplete({
        totalScore,
        riskLevel: riskLevel.level,
        answers,
        date: new Date().toISOString(),
        patient
      });

    } catch (error: any) {
      console.error('Erro ao salvar RaDI:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar avaliação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = allQuestions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.key as keyof TriageAnswers];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">
            Triagem de Disfagia - {patient.nome}
          </h2>
          <Badge variant="outline">
            Pergunta {currentQuestionIndex + 1} de {totalQuestions}
          </Badge>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="text-sm text-muted-foreground mt-2">
          Progresso: {Math.round(progress)}%
        </div>
      </div>

      <Card className="p-6 mb-8">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            {currentQuestion.label}
          </h3>
        </div>

        <div className="flex justify-center">
          <RadioGroup
            value={currentAnswer?.toString() || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.key, parseInt(value))}
            className="flex gap-8"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="0" id="no" />
              <Label htmlFor="no" className="text-lg font-medium cursor-pointer">
                Não
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="yes" />
              <Label htmlFor="yes" className="text-lg font-medium cursor-pointer">
                Sim
              </Label>
            </div>
          </RadioGroup>
        </div>

        {currentQuestionIndex === totalQuestions - 1 && Object.keys(answers).length === totalQuestions && (
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">📊 Preview do Resultado:</h4>
            {(() => {
              const score = calculateRiskScore();
              const risk = getRiskLevel(score);
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Respostas "Sim":</span>
                    <Badge variant="outline">{score} de {totalQuestions}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Nível de Risco:</span>
                    <Badge className={risk.color}>
                      {risk.label}
                    </Badge>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentQuestionIndex === 0 ? 'Voltar' : 'Anterior'}
        </Button>

        <Button
          onClick={handleNext}
          disabled={loading || currentAnswer === undefined}
        >
          {loading ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : currentQuestionIndex === totalQuestions - 1 ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Concluir Triagem
            </>
          ) : (
            <>
              Próxima
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TriageForm;