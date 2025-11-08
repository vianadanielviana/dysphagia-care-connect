import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Download, 
  Eye, 
  Filter, 
  FileText, 
  Clock,
  AlertTriangle,
  CheckCircle,
  User
} from 'lucide-react';

interface HistoryViewProps {
  selectedPatient: any;
  onChangePatient?: () => void;
}

interface TriageRecord {
  id: string;
  completed_at: string;
  total_score: number;
  risk_level: 'baixo' | 'medio' | 'alto';
  caregiver_id: string;
  patient_id: string;
  answers?: any[];
}

interface DailyRecord {
  id: string;
  record_date: string;
  food_consistency: string;
  liquid_consistency?: string;
  liquid_consistency_description?: string | null;
  observations: string;
  risk_score: number;
  photo_urls: string[] | null;
  caregiver_id: string;
  patient_id: string;
  created_at: string;
  symptoms?: { symptom_name: string }[];
  daily_record_symptoms?: { symptom_name: string }[]; // Supabase relation
}

const HistoryView: React.FC<HistoryViewProps> = ({ selectedPatient, onChangePatient }) => {
  const [records, setRecords] = useState<TriageRecord[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<TriageRecord | null>(null);
  const [selectedDailyRecord, setSelectedDailyRecord] = useState<DailyRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'radi' | 'registros'>('radi');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    riskLevel: 'all'
  });
  const { toast } = useToast();

  // Mapeamento das perguntas do RaDI
  const radiQuestions: { [key: string]: string } = {
    'swallow_multiple_times': 'Precisa engolir muitas vezes o alimento para fazê-lo descer?',
    'effort_to_swallow': 'Faz esforço para engolir?',
    'pain_swallowing': 'Sente dor ao engolir?',
    'weight_loss_difficulty': 'Perdeu peso por ter dificuldade de engolir?',
    'throat_clearing': 'Tem pigarro depois de engolir?',
    'voice_changes': 'Sua voz modifica depois de engolir?',
    'choking_after_swallow': 'Tem engasgo depois de engolir?',
    'pneumonia_after_choking': 'Teve pneumonia depois de algum engasgo?',
    'fatigue_after_eating': 'Sente cansaço depois de comer?'
  };

  useEffect(() => {
    if (selectedPatient) {
      console.log('Carregando histórico para paciente:', selectedPatient.nome);
      fetchTriageHistory();
      fetchDailyRecords();
    }
  }, [selectedPatient, filters]);

  const fetchTriageHistory = async () => {
    if (!selectedPatient) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('triage_assessments')
        .select(`
          *,
          triage_answers(*)
        `)
        .eq('patient_id', selectedPatient.id)
        .order('completed_at', { ascending: false });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('completed_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('completed_at', filters.endDate + 'T23:59:59');
      }
      if (filters.riskLevel !== 'all') {
        query = query.eq('risk_level', filters.riskLevel as 'baixo' | 'medio' | 'alto');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar RaDI:', error);
        throw error;
      }
      
      console.log('RaDI records carregados:', data);
      setRecords(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de RaDI",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyRecords = async () => {
    if (!selectedPatient) return;
    
    try {
      let query = supabase
        .from('daily_records')
        .select(`
          *,
          daily_record_symptoms(
            symptom_name
          )
        `)
        .eq('patient_id', selectedPatient.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('record_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('record_date', filters.endDate);
      }
      if (filters.riskLevel !== 'all') {
        const riskRange = filters.riskLevel === 'baixo' ? [0, 3] : 
                         filters.riskLevel === 'medio' ? [4, 6] : [7, 100];
        query = query.gte('risk_score', riskRange[0]).lte('risk_score', riskRange[1]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar registros diários:', error);
        throw error;
      }
      
      console.log('Daily records carregados:', data);
      setDailyRecords(data || []);
    } catch (error) {
      console.error('Erro ao buscar registros diários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar registros diários",
        variant: "destructive",
      });
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      'baixo': { 
        className: 'bg-medical-green text-medical-green-foreground',
        label: 'Sem Sintomas',
        icon: CheckCircle
      },
      'medio': { 
        className: 'bg-medical-amber text-medical-amber-foreground',
        label: 'Presença de Sintomas',
        icon: AlertTriangle
      },
      'alto': { 
        className: 'bg-medical-amber text-medical-amber-foreground',
        label: 'Presença de Sintomas',
        icon: AlertTriangle
      }
    };

    const variant = variants[riskLevel as keyof typeof variants] || variants['baixo'];
    const Icon = variant.icon;

    return (
      <Badge className={variant.className}>
        <Icon className="h-3 w-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const exportToPDF = () => {
    // Simplified PDF export - in a real app you'd use libraries like jsPDF
    const exportData = records.map(record => ({
      data: formatDateTime(record.completed_at).date,
      horario: formatDateTime(record.completed_at).time,
      pontuacao: record.total_score,
      risco: record.risk_level,
    }));

    const csvContent = [
      'Data,Horário,Pontuação,Nível de Risco',
      ...exportData.map(row => `${row.data},${row.horario},${row.pontuacao},${row.risco}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-radi-${selectedPatient.nome}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exportação Concluída",
      description: "Relatório exportado com sucesso",
    });
  };

  const viewDetails = (record: TriageRecord) => {
    setSelectedRecord(record);
  };

  const viewDailyDetails = (record: DailyRecord) => {
    setSelectedDailyRecord(record);
  };

  const getDailyRiskBadge = (riskScore: number) => {
    const riskLevel = riskScore === 0 ? 'baixo' : 'medio'; // Qualquer score > 0 indica presença de sintomas
    return getRiskBadge(riskLevel);
  };

  const getConsistencyLabel = (consistency: string) => {
    const labels: { [key: string]: string } = {
      'normal': 'Normal',
      'facil_mastigar': 'Fácil de Mastigar',
      'umidificados': 'Umidificados',
      'pastosa': 'Pastoso',
      'liquida_fina': 'Líquido' // manter para compatibilidade
    };
    return labels[consistency] || consistency;
  };
  
  const getLiquidConsistencyLabel = (value?: string) => {
    const map: Record<string, string> = {
      'extremamente_espessado': 'Extremamente Espessado',
      'moderadamente_espessado': 'Moderadamente Espessado',
      'levemente_espessado': 'Levemente Espessado',
      'muito_levemente_espessado': 'Muito Levemente Espessado',
      'liquido_fino': 'Líquido Fino',
      // Legado
      'espessado': 'Espessado',
      'normal': 'Normal',
    };
    if (!value) return 'não informado';
    return map[value] || value;
  };
  if (!selectedPatient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Selecione um paciente para ver o histórico</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Histórico de RaDI</h2>
          <p className="text-muted-foreground">Paciente: {selectedPatient.nome}</p>
        </div>
        <div className="flex gap-2">
          {onChangePatient && (
            <Button onClick={onChangePatient} variant="outline">
              <User className="h-4 w-4 mr-2" />
              Trocar Paciente
            </Button>
          )}
          <Button onClick={exportToPDF} disabled={records.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="risk-level">Nível de Risco</Label>
              <Select 
                value={filters.riskLevel} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="baixo">Sem Sintomas</SelectItem>
                  <SelectItem value="medio">Presença de Sintomas</SelectItem>
                  <SelectItem value="alto">Presença de Sintomas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        <Button
          variant={activeTab === 'radi' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('radi')}
          className="rounded-b-none"
        >
          RaDI ({records.length})
        </Button>
        <Button
          variant={activeTab === 'registros' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('registros')}
          className="rounded-b-none"
        >
          Registros Diários ({dailyRecords.length})
        </Button>
      </div>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {activeTab === 'radi' ? 'RaDI Encontrados' : 'Registros Diários Encontrados'}
            </span>
            <Badge variant="outline">
              {activeTab === 'radi' ? `${records.length} RaDI` : `${dailyRecords.length} registros`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activeTab === 'radi' ? (
            records.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum RaDI encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Pontuação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const { date, time } = formatDateTime(record.completed_at);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{date}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            {time}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.total_score} pts</Badge>
                        </TableCell>
                        <TableCell>
                          {getRiskBadge(record.risk_level)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewDetails(record)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )
          ) : (
            dailyRecords.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum registro diário encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyRecords.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex justify-between items-start border-b pb-3">
                        <h4 className="font-semibold">
                          {new Date(record.record_date).toLocaleDateString('pt-BR')}
                        </h4>
                        {getDailyRiskBadge(record.risk_score || 0)}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Consistência de Alimento: </span>
                          <span>{getConsistencyLabel(record.food_consistency)}</span>
                        </div>
                        
                        <div>
                          <span className="font-medium">Consistência de Líquidos: </span>
                          <span>{getLiquidConsistencyLabel(record.liquid_consistency)}</span>
                        </div>
                        
                        {record.liquid_consistency_description && (
                          <div>
                            <span className="font-medium">Marca e Indicação: </span>
                            <span>{record.liquid_consistency_description}</span>
                          </div>
                        )}
                        
                        {record.observations && record.observations.trim() !== '' && (
                          <div>
                            <span className="font-medium">Observações: </span>
                            <span>{record.observations}</span>
                          </div>
                        )}

                        {(() => {
                          const symptomsList = (record as any).symptoms || (record as any).daily_record_symptoms || [];
                          return symptomsList.length > 0 ? (
                            <div>
                              <span className="font-medium">Sintomas: </span>
                              <span>{symptomsList.map((s: any) => s.symptom_name).join(', ')}</span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium">Sintomas: </span>
                              <span>Nenhum</span>
                            </div>
                          );
                        })()}

                        {record.photo_urls && record.photo_urls.length > 0 && (
                          <div>
                            <span className="font-medium">Fotos: </span>
                            <div className="flex gap-2 mt-2">
                              {record.photo_urls.map((photoUrl: string, photoIndex: number) => (
                                <img
                                  key={photoIndex}
                                  src={photoUrl}
                                  alt={`Foto ${photoIndex + 1}`}
                                  className="w-16 h-16 object-cover rounded cursor-pointer"
                                  onClick={() => window.open(photoUrl, '_blank')}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewDailyDetails(record)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do RaDI</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data/Hora</Label>
                  <p className="text-lg font-semibold">
                    {formatDateTime(selectedRecord.completed_at).date} às {formatDateTime(selectedRecord.completed_at).time}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Pontuação Total</Label>
                  <p className="text-lg font-semibold">{selectedRecord.total_score} pontos</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <div className="mt-1">
                  {getRiskBadge(selectedRecord.risk_level)}
                </div>
              </div>

              {/* Texto explicativo do RaDI */}
              <div className="mt-4 p-4 rounded-lg bg-accent/50">
                <Label className="text-sm font-medium mb-2 block">Sobre o RaDI</Label>
                <p className="text-sm text-muted-foreground">
                  <strong>Interpretação:</strong> Quanto maior a pontuação, maior a probabilidade de presença de sintomas relacionados à disfagia orofaríngea. O instrumento não estabelece um ponto de corte fixo universal, mas sugere que qualquer escore positivo seja interpretado como alerta para rastreamento adicional e encaminhamento para exames de referência.
                </p>
              </div>

              {selectedRecord.answers && selectedRecord.answers.length > 0 && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <Label className="text-sm font-medium mb-3 block">
                    📋 Respostas Detalhadas do RaDI
                  </Label>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedRecord.answers.map((answer: any, index: number) => {
                      const question = radiQuestions[answer.question_id] || answer.question_id;
                      const answerText = answer.answer_value === 1 ? 'Sim' : 'Não';
                      const answerColor = answer.answer_value === 1 ? 'bg-medical-amber text-medical-amber-foreground' : 'bg-medical-green text-medical-green-foreground';
                      
                      return (
                        <div key={index} className="flex items-start gap-3 p-3 bg-background rounded border">
                          <span className="text-xl flex-shrink-0">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">{question}</p>
                          </div>
                          <Badge className={answerColor}>
                            {answerText}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Orientações baseadas no status */}
              <div className="mt-6 p-4 rounded-lg bg-muted">
                <Label className="text-sm font-medium mb-2 block">Orientações</Label>
                {selectedRecord.total_score === 0 && (
                  <p className="text-sm text-medical-green">
                    ✅ Nenhum sintoma identificado. Continue monitorando e mantenha as boas práticas de alimentação segura.
                  </p>
                )}
                {selectedRecord.total_score > 0 && (
                  <div className="text-sm text-medical-amber">
                    ⚠️ <strong>Sintomas identificados.</strong> Recomendações:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Busque avaliação fonoaudiológica especializada</li>
                      <li>Considere exames complementares se indicados</li>
                      <li>Mantenha ambiente calmo durante refeições</li>
                      <li>Adote postura ereta ao comer</li>
                      <li>Prefira pequenos volumes e consistência adequada</li>
                    </ul>
                  </div>
                )}
                {selectedRecord.risk_level === 'alto' && (
                  <div className="text-sm text-medical-red">
                    🚨 <strong>ATENÇÃO URGENTE!</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Suspenda alimentação normal</li>
                      <li>Contate imediatamente o profissional</li>
                      <li>Considere ir ao pronto-socorro se houver engasgo</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Daily Record Details Dialog */}
      {selectedDailyRecord && (
        <Dialog open={!!selectedDailyRecord} onOpenChange={() => setSelectedDailyRecord(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Registro Diário</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data</Label>
                  <p className="text-lg font-semibold">
                    {new Date(selectedDailyRecord.record_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Pontuação de Risco</Label>
                  <p className="text-lg font-semibold">{selectedDailyRecord.risk_score || 0} pontos</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Consistência</Label>
                  <p className="text-lg font-semibold">
                    {getConsistencyLabel(selectedDailyRecord.food_consistency)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nível de Risco</Label>
                  <div className="mt-1">
                    {getDailyRiskBadge(selectedDailyRecord.risk_score || 0)}
                  </div>
                </div>
              </div>

              {(selectedDailyRecord.liquid_consistency || selectedDailyRecord.liquid_consistency_description) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Líquidos</Label>
                    <p className="text-lg font-semibold">
                      {getLiquidConsistencyLabel(selectedDailyRecord.liquid_consistency as string | undefined)}
                    </p>
                  </div>
                  {selectedDailyRecord.liquid_consistency_description && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Marca/Indicação</Label>
                      <p className="mt-1 p-3 bg-muted rounded-lg">{selectedDailyRecord.liquid_consistency_description}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedDailyRecord.observations && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Observações</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">{selectedDailyRecord.observations}</p>
                </div>
              )}

              {(() => {
                const symptomsList = (selectedDailyRecord as any).symptoms || (selectedDailyRecord as any).daily_record_symptoms || [];
                return symptomsList.length > 0 ? (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Sintomas Observados
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {symptomsList.map((symptom: any, index: number) => (
                        <Badge key={index} variant="secondary">
                          {symptom.symptom_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Fotos em tamanho maior no modal */}
              {selectedDailyRecord.photo_urls && selectedDailyRecord.photo_urls.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Fotos do Registro
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedDailyRecord.photo_urls.map((photoUrl: string, photoIndex: number) => (
                      <div key={photoIndex} className="relative group">
                        <img
                          src={photoUrl}
                          alt={`Foto ${photoIndex + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(photoUrl, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default HistoryView;