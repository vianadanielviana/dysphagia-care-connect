import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, Upload, Camera, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface TriageFormProps {
  patient: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}

interface TriageAnswers {
  // Step 1 - Questões RaDI 1-5
  multiple_swallows_needed: number;
  effort_to_swallow: number;
  pain_when_swallowing: number;
  weight_loss_difficulty_swallowing: number;
  throat_clearing_after_swallowing: number;
  
  // Step 2 - Questões RaDI 6-9  
  voice_changes_after_swallowing: number;
  choking_after_swallowing: number;
  pneumonia_after_choking: number;
  tiredness_after_eating: number;
  
  // Step 3 - Observações
  additional_observations: string;
}

const TriageForm: React.FC<TriageFormProps> = ({ patient, onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Partial<TriageAnswers>>({
    additional_observations: ''
  });
  const { toast } = useToast();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // Questões do Step 1 - RaDI 1-5
  const step1Questions = [
    { key: 'multiple_swallows_needed', label: 'Precisa engolir muitas vezes o alimento para fazê-lo descer?', icon: '🔄' },
    { key: 'effort_to_swallow', label: 'Faz esforço para engolir?', icon: '💪' },
    { key: 'pain_when_swallowing', label: 'Sente dor ao engolir?', icon: '😣' },
    { key: 'weight_loss_difficulty_swallowing', label: 'Perdeu peso por ter dificuldade de engolir?', icon: '⚖️' },
    { key: 'throat_clearing_after_swallowing', label: 'Tem pigarro depois de engolir?', icon: '😤' }
  ];

  // Questões do Step 2 - RaDI 6-9
  const step2Questions = [
    { key: 'voice_changes_after_swallowing', label: 'Sua voz modifica depois de engolir?', icon: '🗣️' },
    { key: 'choking_after_swallowing', label: 'Tem engasgo depois de engolir?', icon: '😵' },
    { key: 'pneumonia_after_choking', label: 'Teve pneumonia depois de algum engasgo?', icon: '🫁' },
    { key: 'tiredness_after_eating', label: 'Sente cansaço depois de comer?', icon: '😴' }
  ];

  const handleAnswerChange = (questionKey: string, value: number | string) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  const calculateRiskScore = () => {
    let score = 0;
    
    // All RaDI questions are yes/no (0=Não, 1=Sim)
    // Count all "Sim" answers
    const allQuestions = [...step1Questions, ...step2Questions];
    
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
      level: 'normal', 
      label: 'Sem Sintomas', 
      color: 'text-medical-green',
      description: 'Nenhum sintoma identificado no momento da avaliação'
    };
    
    return { 
      level: 'alerta', 
      label: 'Presença de Sintomas', 
      color: 'text-medical-amber',
      description: 'Sintomas identificados. Recomenda-se avaliação adicional e encaminhamento para exames de referência'
    };
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const isStepValid = () => {
    if (currentStep === 1) {
      return step1Questions.every(q => 
        answers[q.key as keyof TriageAnswers] !== undefined
      );
    }
    
    if (currentStep === 2) {
      return step2Questions.every(q => 
        answers[q.key as keyof TriageAnswers] !== undefined
      );
    }
    
    return true; // Step 3 is optional
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
        .filter(([key, value]) => 
          typeof value === 'number' && 
          key !== 'additional_observations'
        )
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

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Questões RaDI - Parte 1
        </h3>
        <p className="text-muted-foreground">
          Responda as questões do rastreamento de disfagia
        </p>
      </div>

      {step1Questions.map((question) => (
        <Card key={question.key} className="p-4">
          <div className="flex items-start space-x-3 mb-4">
            <span className="text-2xl">{question.icon}</span>
            <Label className="text-base font-medium">{question.label}</Label>
          </div>
          
          <RadioGroup
            value={answers[question.key as keyof TriageAnswers]?.toString() || ''}
            onValueChange={(value) => handleAnswerChange(question.key, parseInt(value))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="0" id={`${question.key}-0`} />
              <Label htmlFor={`${question.key}-0`}>Não</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id={`${question.key}-1`} />
              <Label htmlFor={`${question.key}-1`}>Sim</Label>
            </div>
          </RadioGroup>
        </Card>
      ))}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Questões RaDI - Parte 2
        </h3>
        <p className="text-muted-foreground">
          Continue respondendo as questões do rastreamento
        </p>
      </div>

      {step2Questions.map((question) => (
        <Card key={question.key} className="p-4">
          <div className="flex items-start space-x-3 mb-4">
            <span className="text-2xl">{question.icon}</span>
            <Label className="text-base font-medium">{question.label}</Label>
          </div>
          
          <RadioGroup
            value={answers[question.key as keyof TriageAnswers]?.toString() || ''}
            onValueChange={(value) => handleAnswerChange(question.key, parseInt(value))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="0" id={`${question.key}-0`} />
              <Label htmlFor={`${question.key}-0`}>Não</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id={`${question.key}-1`} />
              <Label htmlFor={`${question.key}-1`}>Sim</Label>
            </div>
          </RadioGroup>
        </Card>
      ))}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Evidências e Observações
        </h3>
        <p className="text-muted-foreground">
          Upload de arquivos e observações adicionais (opcional)
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium mb-3 block">
              📷 Upload de Foto do Prato (opcional)
            </Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Tire uma foto do prato antes/depois da refeição
              </p>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Foto
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium mb-3 block">
              🎥 Upload de Vídeo (opcional, máx. 30 segundos)
            </Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Grave um vídeo curto da alimentação
              </p>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Vídeo
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="observations" className="text-base font-medium">
              📝 Observações Adicionais
            </Label>
            <Textarea
              id="observations"
              placeholder="Descreva qualquer observação adicional sobre a alimentação, comportamento, ambiente, etc..."
              value={answers.additional_observations || ''}
              onChange={(e) => handleAnswerChange('additional_observations', e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>
        </div>
      </Card>

      {/* Preview do resultado */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">📊 Preview do Resultado</h4>
        <div className="space-y-3">
          {(() => {
            const score = calculateRiskScore();
            const risk = getRiskLevel(score);
            return (
              <>
                <div className="flex items-center justify-between">
                  <span>Pontuação Total:</span>
                  <Badge variant="outline">{score} pontos</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge 
                    className={`${
                      risk.level === 'alerta' ? 'bg-medical-amber text-medical-amber-foreground' :
                      'bg-medical-green text-medical-green-foreground'
                    }`}
                  >
                    {risk.label}
                  </Badge>
                </div>
                {score > 0 && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Interpretação RaDI:</strong> Quanto maior a pontuação, maior a probabilidade de presença de sintomas relacionados à disfagia orofaríngea. O instrumento não estabelece um ponto de corte fixo universal, mas sugere que qualquer escore positivo seja interpretado como alerta para rastreamento adicional e encaminhamento para exames de referência.
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">
            RaDI de Disfagia - {patient.nome}
          </h2>
          <Badge variant="outline">
            Passo {currentStep} de {totalSteps}
          </Badge>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>RaDI 1-5</span>
          <span>RaDI 6-9</span>
          <span>Evidências</span>
        </div>
      </div>

      <div className="mb-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Voltar' : 'Anterior'}
        </Button>

        <Button
          onClick={handleNext}
          disabled={loading || (currentStep < 3 && !isStepValid())}
        >
          {loading ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : currentStep === totalSteps ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Concluir RaDI
            </>
          ) : (
            <>
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TriageForm;