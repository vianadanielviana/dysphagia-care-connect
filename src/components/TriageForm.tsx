import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Clock,
  Camera,
  Upload
} from 'lucide-react';

interface TriageAnswers {
  multiple_swallows_needed?: number;
  effort_to_swallow?: number;
  pain_when_swallowing?: number;
  weight_loss_difficulty_swallowing?: number;
  throat_clearing_after_swallowing?: number;
  voice_changes_after_swallowing?: number;
  choking_after_swallowing?: number;
  pneumonia_after_choking?: number;
  tiredness_after_eating?: number;
  additional_observations?: string;
}

interface TriageFormProps {
  patient: any;
  onComplete: (data: any) => void;  
  onBack: () => void;
}

const TriageForm: React.FC<TriageFormProps> = ({ patient, onComplete, onBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<TriageAnswers>>({
    additional_observations: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Todas as 9 perguntas do RaDI
  const allQuestions = [
    { key: 'multiple_swallows_needed', label: 'Precisa engolir muitas vezes o alimento para fazê-lo descer?' },
    { key: 'effort_to_swallow', label: 'Faz esforço para engolir?' },
    { key: 'pain_when_swallowing', label: 'Sente dor ao engolir?' },
    { key: 'weight_loss_difficulty_swallowing', label: 'Perdeu peso por ter dificuldade de engolir?' },
    { key: 'throat_clearing_after_swallowing', label: 'Tem pigarro depois de engolir?' },
    { key: 'voice_changes_after_swallowing', label: 'Sua voz modifica depois de engolir?' },
    { key: 'choking_after_swallowing', label: 'Tem engasgo depois de engolir?' },
    { key: 'pneumonia_after_choking', label: 'Teve pneumonia depois de algum engasgo?' },
    { key: 'tiredness_after_eating', label: 'Sente cansaço depois de comer?' }
  ];

  const currentQuestion = allQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === allQuestions.length - 1;
  const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;

  const handleAnswerChange = (questionKey: string, value: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  const calculateRiskScore = () => {
    let score = 0;
    allQuestions.forEach(q => {
      const answer = answers[q.key as keyof TriageAnswers];
      if (answer === 1) { // "Sim"
        score += 1;
      }
    });
    return score;
  };

  const getRiskLevel = (score: number) => {
    if (score === 0) return { 
      level: 'baixo', 
      label: 'Sem Sintomas', 
      color: 'text-medical-green',
      description: 'Nenhum sintoma identificado no momento da avaliação'
    };
    
    if (score <= 3) return { 
      level: 'medio', 
      label: 'Sintomas Leves', 
      color: 'text-medical-amber',
      description: 'Alguns sintomas identificados. Recomenda-se monitoramento'
    };
    
    return { 
      level: 'alto', 
      label: 'Sintomas Importantes', 
      color: 'text-medical-red',
      description: 'Múltiplos sintomas identificados. Recomenda-se avaliação urgente e encaminhamento para exames de referência'
    };
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      onBack();
    }
  };

  const isCurrentQuestionAnswered = () => {
    return answers[currentQuestion.key as keyof TriageAnswers] !== undefined;
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
      const answersToSave = allQuestions
        .filter(q => answers[q.key as keyof TriageAnswers] !== undefined)
        .map(q => ({
          assessment_id: assessment.id,
          question_id: q.key,
          answer_value: answers[q.key as keyof TriageAnswers] as number
        }));

      if (answersToSave.length > 0) {
        const { error: answersError } = await supabase
          .from('triage_answers')
          .insert(answersToSave);

        if (answersError) throw answersError;
      }

      toast({
        title: "RaDI completado!",
        description: `Avaliação salva com sucesso. Status: ${riskLevel.label}`,
      });

      onComplete({
        totalScore,
        riskLevel: riskLevel.level,
        answers,
        date: new Date().toISOString(),
        patient
      });

    } catch (error: any) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar avaliação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Triagem de Disfagia
            </h2>
            <p className="text-muted-foreground mt-1">
              Paciente: {patient.nome}
            </p>
          </div>
          <Badge variant="outline">
            Pergunta {currentQuestionIndex + 1} de {allQuestions.length}
          </Badge>
        </div>
        
        <Progress value={progress} className="h-2" />
      </div>

      <div className="mb-8">
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              {currentQuestion.label}
            </h3>
          </div>
          
          <RadioGroup
            value={answers[currentQuestion.key as keyof TriageAnswers]?.toString() || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.key, parseInt(value))}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="0" id={`${currentQuestion.key}-0`} />
              <Label htmlFor={`${currentQuestion.key}-0`} className="cursor-pointer flex-1">Não</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="1" id={`${currentQuestion.key}-1`} />
              <Label htmlFor={`${currentQuestion.key}-1`} className="cursor-pointer flex-1">Sim</Label>
            </div>
          </RadioGroup>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentQuestionIndex === 0 ? 'Trocar Paciente' : 'Pergunta anterior'}
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={loading || !isCurrentQuestionAnswered()}
        >
          {loading ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : isLastQuestion ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Concluir RaDI
            </>
          ) : (
            <>
              Próxima pergunta
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TriageForm;