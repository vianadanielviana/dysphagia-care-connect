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

const HistoryView: React.FC<HistoryViewProps> = ({ selectedPatient }) => {
  const [records, setRecords] = useState<TriageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<TriageRecord | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    riskLevel: 'all'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (selectedPatient) {
      fetchTriageHistory();
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

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de triagens",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      'baixo': { 
        className: 'bg-medical-green text-medical-green-foreground',
        label: 'Baixo Risco',
        icon: CheckCircle
      },
      'medio': { 
        className: 'bg-medical-amber text-medical-amber-foreground',
        label: 'Médio Risco',
        icon: AlertTriangle
      },
      'alto': { 
        className: 'bg-medical-red text-medical-red-foreground',
        label: 'Alto Risco',
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
    a.download = `historico-triagens-${selectedPatient.nome}.csv`;
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
          <h2 className="text-2xl font-bold text-foreground">Histórico de Triagens</h2>
          <p className="text-muted-foreground">Paciente: {selectedPatient.nome}</p>
        </div>
        <Button onClick={exportToPDF} disabled={records.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
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
                  <SelectItem value="baixo">Baixo Risco</SelectItem>
                  <SelectItem value="medio">Médio Risco</SelectItem>
                  <SelectItem value="alto">Alto Risco</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Registros Encontrados</span>
            <Badge variant="outline">{records.length} triagens</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma triagem encontrada</p>
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
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Triagem</DialogTitle>
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
                <Label className="text-sm font-medium text-muted-foreground">Nível de Risco</Label>
                <div className="mt-1">
                  {getRiskBadge(selectedRecord.risk_level)}
                </div>
              </div>

              {selectedRecord.answers && selectedRecord.answers.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Respostas Detalhadas
                  </Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedRecord.answers.map((answer: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">{answer.question_id}</span>
                        <Badge variant="outline">{answer.answer_value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orientações baseadas no risco */}
              <div className="mt-6 p-4 rounded-lg bg-muted">
                <Label className="text-sm font-medium mb-2 block">Orientações</Label>
                {selectedRecord.risk_level === 'baixo' && (
                  <p className="text-sm text-medical-green">
                    ✅ Continue monitorando. Mantenha as boas práticas de alimentação segura.
                  </p>
                )}
                {selectedRecord.risk_level === 'medio' && (
                  <div className="text-sm text-medical-amber">
                    ⚠️ <strong>Atenção aumentada necessária.</strong> Considere:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Ambiente calmo durante refeições</li>
                      <li>Postura ereta ao comer</li>
                      <li>Pequenos goles e mordidas</li>
                      <li>Contate o fonoaudiólogo se persistir</li>
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
    </div>
  );
};

export default HistoryView;