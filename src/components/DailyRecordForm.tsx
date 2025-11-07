import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Camera, Upload, Save, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
interface DailyRecordFormProps {
  patient: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}
interface DailyRecordData {
  record_date: string;
  food_consistency: 'normal' | 'pastosa' | 'liquida_modificada' | 'liquida_fina' | 'facil_mastigar' | 'umidificados';
  liquid_consistency: 'extremamente_espessado' | 'moderadamente_espessado' | 'levemente_espessado' | 'muito_levemente_espessado' | 'liquido_fino';
  liquid_consistency_description: string;
  observations: string;
  symptoms: string[];
}
const DailyRecordForm: React.FC<DailyRecordFormProps> = ({
  patient,
  onComplete,
  onBack
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const {
    toast
  } = useToast();
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: {
      errors
    }
  } = useForm<DailyRecordData>({
    defaultValues: {
      record_date: new Date().toISOString().split('T')[0],
      food_consistency: 'normal',
      liquid_consistency: 'liquido_fino',
      liquid_consistency_description: '',
      observations: ''
    }
  });
  const symptoms = [{
    id: 'tosse',
    label: 'Tosse durante alimentação',
    icon: '😮‍💨'
  }, {
    id: 'engasgo',
    label: 'Engasgo',
    icon: '😵'
  }, {
    id: 'voz_molhada',
    label: 'Voz molhada após comer',
    icon: '🗣️'
  }, {
    id: 'deglutição_lenta',
    label: 'Deglutição lenta',
    icon: '⏱️'
  }, {
    id: 'residuo_oral',
    label: 'Resíduo na boca',
    icon: '🍽️'
  }, {
    id: 'recusa_alimentar',
    label: 'Recusa alimentar',
    icon: '🚫'
  }, {
    id: 'fadiga',
    label: 'Fadiga durante alimentação',
    icon: '😴'
  }, {
    id: 'perda_peso',
    label: 'Perda de peso',
    icon: '⚖️'
  }];
  const consistencyOptions = [{
    value: 'normal',
    label: 'Normal',
    description: 'Sólidos, dieta regular',
    color: 'bg-green-100 text-green-800'
  }, {
    value: 'facil_mastigar',
    label: 'Fácil de Mastigar',
    description: 'Alimentos macios',
    color: 'bg-blue-100 text-blue-800'
  }, {
    value: 'umidificados',
    label: 'Umidificados',
    description: 'Alimentos macios com líquidos',
    color: 'bg-cyan-100 text-cyan-800'
  }, {
    value: 'pastosa',
    label: 'Pastoso',
    description: 'Alimento triturado',
    color: 'bg-orange-100 text-orange-800'
  }, {
    value: 'liquida_modificada',
    label: 'Líquida Modificada',
    description: 'Líquidos espessados ou modificados',
    color: 'bg-indigo-100 text-indigo-800'
  }, {
    value: 'liquida_fina',
    label: 'Líquida Fina',
    description: 'Líquidos normais sem modificação',
    color: 'bg-purple-100 text-purple-800'
  }];
  const liquidConsistencyOptions = [{
    value: 'extremamente_espessado',
    label: 'Extremamente Espessado'
  }, {
    value: 'moderadamente_espessado',
    label: 'Moderadamente Espessado'
  }, {
    value: 'levemente_espessado',
    label: 'Levemente Espessado'
  }, {
    value: 'muito_levemente_espessado',
    label: 'Muito Levemente Espessado'
  }, {
    value: 'liquido_fino',
    label: 'Líquido Fino'
  }];
  const handleSymptomChange = (symptomId: string, checked: boolean) => {
    setSelectedSymptoms(prev => checked ? [...prev, symptomId] : prev.filter(id => id !== symptomId));
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
    if (consistency === 'pastosa') score += 1;
    return score;
  };
  const getRiskLevel = (score: number) => {
    if (score === 0) return {
      level: 'normal',
      label: 'Sem Sintomas',
      color: 'text-medical-green'
    };
    return {
      level: 'alerta',
      label: 'Presença de Sintomas',
      color: 'text-medical-amber'
    };
  };
  const onSubmit = async (data: DailyRecordData) => {
    setLoading(true);
    try {
      const riskScore = calculateRiskScore();
      const riskLevel = getRiskLevel(riskScore);

      // Save daily record (sempre cria novo registro)
      const {
        data: authData
      } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      
      const payload = {
        patient_id: patient.id,
        caregiver_id: userId,
        record_date: data.record_date,
        food_consistency: data.food_consistency,
        liquid_consistency: data.liquid_consistency,
        liquid_consistency_description: data.liquid_consistency_description,
        observations: data.observations,
        risk_score: riskScore,
        photo_urls: photoUrls
      };
      const {
        data: record,
        error: insertError
      } = await supabase
        .from('daily_records')
        .insert<any>(payload)
        .select()
        .single();
      
      if (insertError) throw insertError;

      // Replace symptoms for this record (clear then insert selected)
      if (record?.id) {
        await supabase.from('daily_record_symptoms').delete().eq('daily_record_id', record.id);
        
        if (selectedSymptoms.length > 0) {
          const symptomsToSave = selectedSymptoms.map(symptomId => ({
            daily_record_id: record.id,
            symptom_name: symptoms.find(s => s.id === symptomId)?.label || symptomId
          }));
          const {
            error: symptomsError
          } = await supabase.from('daily_record_symptoms').insert(symptomsToSave);
          if (symptomsError) throw symptomsError;
        }
      }
      toast({
        title: "Registro Salvo",
        description: `Registro diário salvo com sucesso. Nível de risco: ${riskLevel.label}`
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
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const riskScore = calculateRiskScore();
  const riskLevel = getRiskLevel(riskScore);
  return <div className="min-h-screen flex flex-col">
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
          {/* Date */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Data do Registro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input type="date" {...register('record_date', {
              required: 'Data é obrigatória'
            })} className="w-full p-2 border rounded-md" />
              {errors.record_date && <p className="text-sm text-destructive mt-1">{errors.record_date.message}</p>}
            </CardContent>
          </Card>

          {/* Food Consistency */}
          <Card>
            <CardHeader>
              <CardTitle>Consistência das Ingestas Orais Oferecidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Alimento</h3>
                <Controller
                  name="food_consistency"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange}>
                      {consistencyOptions.map((option, index) => {
                        const badgeConfig = [{
                          number: 7,
                          color: 'bg-black text-white'
                        }, {
                          number: 7,
                          color: 'bg-black text-white'
                        }, {
                          number: 6,
                          color: 'bg-blue-500 text-white'
                        }, {
                          number: 5,
                          color: 'bg-orange-500 text-white'
                        }, {
                          number: 4,
                          color: 'bg-green-500 text-white'
                        }, {
                          number: 3,
                          color: 'bg-yellow-500 text-black'
                        }];
                        const badge = badgeConfig[index];
                        return (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={option.value} />
                            <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{option.label}</span>
                                <Badge className={badge.color}>{badge.number}</Badge>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Líquidos</h3>
                <Controller
                  name="liquid_consistency"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange}>
                      {liquidConsistencyOptions.map((option, index) => {
                        const badgeConfig = [{
                          number: 4,
                          color: 'bg-green-500 text-white'
                        }, {
                          number: 3,
                          color: 'bg-yellow-500 text-black'
                        }, {
                          number: 2,
                          color: 'bg-blue-500 text-white'
                        }, {
                          number: 1,
                          color: 'bg-gray-500 text-white'
                        }, {
                          number: 0,
                          color: 'bg-black text-white'
                        }];
                        const badge = badgeConfig[index];
                        return (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`liquid_${option.value}`} />
                            <Label htmlFor={`liquid_${option.value}`} className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{option.label}</span>
                                <Badge className={badge.color}>{badge.number}</Badge>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Liquid Consistency Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descreva marca e indicação de Consistência de líquidos</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                {...register('liquid_consistency_description')} 
                placeholder="Ex: 1 colher medida ou sachê para 100 ml de líquido fino" 
                className="min-h-[100px]" 
              />
            </CardContent>
          </Card>

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
                {symptoms.map(symptom => <div key={symptom.id} className="flex items-center space-x-3">
                    <Checkbox id={symptom.id} checked={selectedSymptoms.includes(symptom.id)} onCheckedChange={checked => handleSymptomChange(symptom.id, checked as boolean)} />
                    <Label htmlFor={symptom.id} className="flex items-center space-x-2 cursor-pointer">
                      <span className="text-lg">{symptom.icon}</span>
                      <span>{symptom.label}</span>
                    </Label>
                  </div>)}
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea {...register('observations')} placeholder="Descreva detalhes sobre a alimentação, comportamento, ambiente, medicamentos, etc..." className="min-h-[120px]" />
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
              <PhotoCapture onPhotosChange={setPhotoUrls} maxPhotos={3} />
            </CardContent>
          </Card>

          {/* Risk Preview */}
          {(selectedSymptoms.length > 0 || riskScore > 0) && <Card className={`border-l-4 ${riskLevel.level === 'alto' ? 'border-l-red-500 bg-red-50' : riskLevel.level === 'medio' ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-green-500 bg-green-50'}`}>
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
            </Card>}
        </form>
      </div>
      
      {/* Fixed Actions for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 md:hidden">
        <div className="flex justify-between gap-4">
          <Button type="button" variant="outline" onClick={onBack} disabled={loading} className="flex-1">
            Voltar
          </Button>

          <Button type="submit" disabled={loading} className="flex-1" onClick={handleSubmit(onSubmit)}>
            {loading ? <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </> : <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Registro
              </>}
          </Button>
        </div>
      </div>

      {/* Actions for Desktop */}
      <div className="hidden md:block max-w-4xl mx-auto px-6 pb-6">
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
            Voltar
          </Button>

          <Button type="submit" disabled={loading} onClick={handleSubmit(onSubmit)}>
            {loading ? <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </> : <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Registro
              </>}
          </Button>
        </div>
      </div>
    </div>;
};
export default DailyRecordForm;