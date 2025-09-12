import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PhotoCapture from '@/components/PhotoCapture';
import { 
  Camera, 
  Upload, 
  Save, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock
} from 'lucide-react';

interface DailyRecordFormProps {
  patient: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}

interface DailyRecordData {
  record_date: string;
  food_consistency: 'liquida_fina' | 'pastosa' | 'normal';
  observations: string;
  symptoms: string[];
}

const DailyRecordForm: React.FC<DailyRecordFormProps> = ({ patient, onComplete, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const { toast } = useToast();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<DailyRecordData>({
    defaultValues: {
      record_date: new Date().toISOString().split('T')[0],
      food_consistency: 'normal',
      observations: '',
    }
  });

  const symptoms = [
    { id: 'tosse', label: 'Tosse durante alimentação', icon: '🤧' },
    { id: 'engasgo', label: 'Engasgo', icon: '😵' },
    { id: 'voz_molhada', label: 'Voz molhada após comer', icon: '🗣️' },
    { id: 'deglutição_lenta', label: 'Deglutição lenta', icon: '⏱️' },
    { id: 'residuo_oral', label: 'Resíduo na boca', icon: '🍽️' },
    { id: 'recusa_alimentar', label: 'Recusa alimentar', icon: '🚫' },
    { id: 'fadiga', label: 'Fadiga durante alimentação', icon: '😴' },
    { id: 'perda_peso', label: 'Perda de peso', icon: '⚖️' }
  ];

  const consistencyOptions = [
    { 
      value: 'liquida_fina', 
      label: 'Líquido', 
      description: 'Água, sucos, chás',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      value: 'pastosa', 
      label: 'Pastoso', 
      description: 'Purês, vitaminas, sopas',
      color: 'bg-orange-100 text-orange-800'
    },
    { 
      value: 'normal', 
      label: 'Normal', 
      description: 'Sólidos, dieta regular',
      color: 'bg-green-100 text-green-800'
    }
  ];

  const handleSymptomChange = (symptomId: string, checked: boolean) => {
    setSelectedSymptoms(prev => 
      checked 
        ? [...prev, symptomId]
        : prev.filter(id => id !== symptomId)
    );
  };

  const calculateRiskScore = () => {
    // Simple risk calculation based on symptoms
    const highRiskSymptoms = ['tosse', 'engasgo', 'voz_molhada'];
    const mediumRiskSymptoms = ['deglutição_lenta', 'residuo_oral', 'recusa_alimentar'];
    
    let score = 0;
    selectedSymptoms.forEach(symptom => {
      if (highRiskSymptoms.includes(symptom)) {
        score += 3;
      } else if (mediumRiskSymptoms.includes(symptom)) {
        score += 2;
      } else {
        score += 1;
      }
    });

    // Adjust based on consistency
    const consistency = watch('food_consistency');
    if (consistency === 'liquida_fina') score += 1;

    return score;
  };

  const getRiskLevel = (score: number) => {
    if (score === 0) return { level: 'normal', label: 'Sem Sintomas', color: 'text-medical-green' };
    return { level: 'alerta', label: 'Presença de Sintomas', color: 'text-medical-amber' };
  };

  const onSubmit = async (data: DailyRecordData) => {
    setLoading(true);
    
    try {
      const riskScore = calculateRiskScore();
      const riskLevel = getRiskLevel(riskScore);

      // Save daily record
      const { data: record, error: recordError } = await supabase
        .from('daily_records')
        .insert({
          patient_id: patient.id,
          caregiver_id: (await supabase.auth.getUser()).data.user?.id,
          record_date: data.record_date,
          food_consistency: data.food_consistency,
          observations: data.observations,
          risk_score: riskScore,
          photo_urls: photoUrls
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // Save symptoms
      if (selectedSymptoms.length > 0) {
        const symptomsToSave = selectedSymptoms.map(symptomId => ({
          daily_record_id: record.id,
          symptom_name: symptoms.find(s => s.id === symptomId)?.label || symptomId
        }));

        const { error: symptomsError } = await supabase
          .from('daily_record_symptoms')
          .insert(symptomsToSave);

        if (symptomsError) throw symptomsError;
      }

      toast({
        title: "Registro Salvo",
        description: `Registro diário salvo com sucesso. Nível de risco: ${riskLevel.label}`,
      });

      onComplete({
        ...data,
        riskScore,
        riskLevel: riskLevel.level,
        symptoms: selectedSymptoms,
        patient
      });

    } catch (error: any) {
      console.error('Erro ao salvar registro:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar registro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const riskScore = calculateRiskScore();
  const riskLevel = getRiskLevel(riskScore);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto p-4 md:p-6 pb-20 md:pb-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Registro Diário - {patient.nome}
          </h2>
          <p className="text-muted-foreground">
            Registre as observações sobre a alimentação do dia
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Date and Food Consistency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Data do Registro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="date"
                  {...register('record_date', { required: 'Data é obrigatória' })}
                  className="w-full p-2 border rounded-md"
                />
                {errors.record_date && (
                  <p className="text-sm text-destructive mt-1">{errors.record_date.message}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consistência da Alimentação</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={watch('food_consistency')} 
                  {...register('food_consistency')}
                >
                  {consistencyOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.label}</span>
                          <Badge className={option.color}>{option.description}</Badge>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Symptoms */}
          <Card>
            <CardHeader>
              <CardTitle>Sintomas Observados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Marque todos os sintomas observados durante a alimentação
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {symptoms.map((symptom) => (
                  <div key={symptom.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={symptom.id}
                      checked={selectedSymptoms.includes(symptom.id)}
                      onCheckedChange={(checked) => 
                        handleSymptomChange(symptom.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={symptom.id} className="flex items-center space-x-2 cursor-pointer">
                      <span className="text-lg">{symptom.icon}</span>
                      <span>{symptom.label}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register('observations')}
                placeholder="Descreva detalhes sobre a alimentação, comportamento, ambiente, medicamentos, etc..."
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Photo Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Fotos da Alimentação (Opcional)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Capture ou carregue fotos que possam ajudar na avaliação
              </p>
            </CardHeader>
            <CardContent>
              <PhotoCapture 
                onPhotosChange={setPhotoUrls}
                maxPhotos={3}
              />
            </CardContent>
          </Card>

          {/* Risk Preview */}
          {(selectedSymptoms.length > 0 || riskScore > 0) && (
            <Card className={`border-l-4 ${
              riskLevel.level === 'alto' ? 'border-l-red-500 bg-red-50' :
              riskLevel.level === 'medio' ? 'border-l-yellow-500 bg-yellow-50' :
              'border-l-green-500 bg-green-50'
            }`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Avaliação de Risco</h4>
                    <p className={`text-lg font-semibold ${riskLevel.color}`}>
                      {riskLevel.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pontuação: {riskScore} pontos
                    </p>
                  </div>
                  <div className="text-right">
                    {riskLevel.level === 'alto' && <AlertTriangle className="h-8 w-8 text-red-500" />}
                    {riskLevel.level === 'medio' && <AlertTriangle className="h-8 w-8 text-yellow-500" />}
                    {riskLevel.level === 'baixo' && <CheckCircle className="h-8 w-8 text-green-500" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
      
      {/* Fixed Actions for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 md:hidden">
        <div className="flex justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={loading}
            className="flex-1"
          >
            Voltar
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
            onClick={handleSubmit(onSubmit)}
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Registro
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Actions for Desktop */}
      <div className="hidden md:block max-w-4xl mx-auto px-6 pb-6">
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={loading}
          >
            Voltar
          </Button>

          <Button
            type="submit"
            disabled={loading}
            onClick={handleSubmit(onSubmit)}
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Registro
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DailyRecordForm;