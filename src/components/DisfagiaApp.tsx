import React, { useState, useEffect } from 'react';
import TeamChat from './TeamChat';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { User, Camera, Upload, MessageCircle, AlertTriangle, CheckCircle, Calendar, TrendingUp, FileText, Phone, LogOut, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface TriageData {
  totalScore?: number;
  riskLevel?: 'baixo' | 'medio' | 'alto';
  answers?: Record<string, number>;
  date?: string;
  patient?: any;
}

const DisfagiaApp = () => {
  const { profile, signOut, isAdmin, isProfessional } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('dashboard');
  const [triageData, setTriageData] = useState<TriageData>({});
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [dailyRecords, setDailyRecords] = useState([
    { date: '2025-08-10', risco: 2, sintomas: 1, consistencia: 'normal' },
    { date: '2025-08-11', risco: 3, sintomas: 2, consistencia: 'modificada' },
    { date: '2025-08-12', risco: 1, sintomas: 0, consistencia: 'normal' },
    { date: '2025-08-13', risco: 4, sintomas: 3, consistencia: 'líquida' },
    { date: '2025-08-14', risco: 2, sintomas: 1, consistencia: 'pastosa' },
    { date: '2025-08-15', risco: 1, sintomas: 0, consistencia: 'normal' },
    { date: '2025-08-16', risco: 2, sintomas: 1, consistencia: 'normal' }
  ]);

  const patients = [
    { id: 1, name: 'Maria Silva', age: 78, lastUpdate: '2025-08-16', riskLevel: 'baixo', caregiver: 'Ana Silva (filha)' },
    { id: 2, name: 'João Santos', age: 65, lastUpdate: '2025-08-16', riskLevel: 'alto', caregiver: 'Carlos Santos (filho)' },
    { id: 3, name: 'Rosa Lima', age: 82, lastUpdate: '2025-08-15', riskLevel: 'médio', caregiver: 'Home Care Plus' }
  ];

  // Main Dashboard Component - Works for both professionals and caregivers
  const MainDashboard = () => (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                {isProfessional ? 'DisfagiaMonitor Pro' : 'DisfagiaMonitor'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {profile?.tipo_usuario === 'fonoaudiologo' ? 'Fonoaudiólogo' : 'Cuidador'}: {profile?.nome}
              </span>
              {(isAdmin || isProfessional) && (
                <Button 
                  onClick={() => navigate('/admin/usuarios')}
                  variant="ghost"
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {isAdmin ? 'Admin' : 'Gerenciar'}
                </Button>
              )}
              <Button 
                onClick={signOut}
                variant="ghost"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['dashboard', 'triagem', 'registro', 'historico', 'comunicacao'].map((view) => (
              <Button
                key={view}
                onClick={() => {
                  if (view === 'triagem') {
                    setCurrentView('patient-selection');
                  } else if (view === 'registro') {
                    setCurrentView('patient-selection-registro');
                  } else {
                    setCurrentView(view);
                  }
                }}
                variant="ghost"
                className={`rounded-none border-b-2 ${
                  currentView === view 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                {view === 'dashboard' && 'Resumo'}
                {view === 'triagem' && 'Triagem'}
                {view === 'registro' && 'Registro Diário'}
                {view === 'historico' && 'Histórico'}
                {view === 'comunicacao' && 'Comunicação'}
              </Button>
            ))}
            <Button
              onClick={() => navigate('/pacientes')}
              variant="ghost"
              className="rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            >
              Pacientes
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'dashboard' && <DashboardContent />}
        {currentView === 'patient-selection' && <PatientSelection />}
        {currentView === 'patient-selection-view' && <PatientSelectionForView />}
        {currentView === 'patient-selection-registro' && <PatientSelectionForRegistro />}
        {currentView === 'triagem' && <TriagemForm />}
        {currentView === 'registro' && <DailyRecordForm />}
        {currentView === 'historico' && <HistoryView />}
        {currentView === 'comunicacao' && <CommunicationView />}
      </main>
    </div>
  );

  const DashboardContent = () => {
    const [triageHistory, setTriageHistory] = useState([]);
    const [loadingTriageHistory, setLoadingTriageHistory] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
      if (selectedPatient) {
        fetchTriageHistory();
      }
    }, [selectedPatient]);

    const fetchTriageHistory = async () => {
      if (!selectedPatient) return;
      
      try {
        setLoadingTriageHistory(true);
        const { data, error } = await supabase
          .from('triage_assessments')
          .select(`
            *,
            triage_answers(*)
          `)
          .eq('patient_id', selectedPatient.id)
          .order('completed_at', { ascending: false });

        if (error) throw error;

        const formattedData = data?.map(assessment => ({
          date: new Date(assessment.completed_at).toLocaleDateString('pt-BR'),
          risco: assessment.risk_level === 'baixo' ? 1 : assessment.risk_level === 'medio' ? 2 : 3,
          pontuacao: assessment.total_score,
          riskLevel: assessment.risk_level
        })) || [];

        setTriageHistory(formattedData);
      } catch (error) {
        console.error('Erro ao buscar histórico de triagens:', error);
      } finally {
        setLoadingTriageHistory(false);
      }
    };

    // Professional Dashboard shows overview of all patients
    if (isProfessional) {
      return (
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard Profissional</h2>
            <p className="text-muted-foreground">Gerencie seus pacientes e acompanhe a evolução</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total de Pacientes</p>
                    <p className="text-2xl font-semibold text-foreground">24</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Alto Risco</p>
                    <p className="text-2xl font-semibold text-foreground">3</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MessageCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Mensagens Pendentes</p>
                    <p className="text-2xl font-semibold text-foreground">7</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Consultas Hoje</p>
                    <p className="text-2xl font-semibold text-foreground">5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Pacientes Monitorados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Cuidador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Última Atualização
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Nível de Risco
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {patients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">{patient.name}</div>
                            <div className="text-sm text-muted-foreground">{patient.age} anos</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {patient.caregiver}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {new Date(patient.lastUpdate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            className={
                              patient.riskLevel === 'baixo' ? 'bg-green-100 text-green-800' :
                              patient.riskLevel === 'médio' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }
                          >
                            {patient.riskLevel}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button variant="link" size="sm" className="text-primary">Ver Detalhes</Button>
                          <Button variant="link" size="sm" className="text-green-600">Mensagem</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Caregiver Dashboard - focused on selected patient
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Paciente Selecionado</span>
                <Button 
                  onClick={() => setCurrentView('patient-selection-view')} 
                  variant="outline" 
                  size="sm"
                >
                  Trocar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPatient ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{selectedPatient.nome}</p>
                      {selectedPatient.data_nascimento && (
                        <p className="text-sm text-muted-foreground">
                          {new Date().getFullYear() - new Date(selectedPatient.data_nascimento).getFullYear()} anos
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-3">Nenhum paciente selecionado</p>
                  <Button onClick={() => setCurrentView('patient-selection-view')} size="sm">
                    Selecionar Paciente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Status Atual</p>
                  <p className="text-2xl font-semibold text-muted-foreground">Não avaliado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Última Avaliação</p>
                  <p className="text-2xl font-semibold text-foreground">Nunca</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do Risco (Últimas Triagens)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Selecione um paciente para ver os dados</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => setCurrentView('patient-selection')}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center space-y-2"
                >
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="text-sm">Nova Triagem</span>
                </Button>
                
                <Button 
                  onClick={() => navigate('/pacientes')}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center space-y-2"
                >
                  <User className="h-6 w-6 text-primary" />
                  <span className="text-sm">Pacientes</span>
                </Button>
                
                <Button 
                  onClick={() => setCurrentView('comunicacao')}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center space-y-2"
                >
                  <MessageCircle className="h-6 w-6 text-primary" />
                  <span className="text-sm">Comunicação</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Placeholder components for other views
  const PatientSelection = () => (
    <div className="px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">Seleção de Paciente</h2>
      <p className="text-muted-foreground">Selecione um paciente para realizar a triagem.</p>
    </div>
  );

  const PatientSelectionForView = () => (
    <div className="px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">Selecionar Paciente</h2>
      <p className="text-muted-foreground">Escolha um paciente para visualizar.</p>
    </div>
  );

  const PatientSelectionForRegistro = () => (
    <div className="px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">Seleção de Paciente</h2>
      <p className="text-muted-foreground">Selecione um paciente para registro diário.</p>
    </div>
  );

  // Triagem Form Component
  const TriagemForm = () => {
    const [patients, setPatients] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [selectedPatientForTriage, setSelectedPatientForTriage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetchPatients();
      fetchAssessments();
    }, []);

    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
      }
    };

    const fetchAssessments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('triage_assessments')
          .select(`
            *,
            patients!inner(name, age),
            triage_answers(*)
          `)
          .order('completed_at', { ascending: false });

        if (error) throw error;
        setAssessments(data || []);
      } catch (error) {
        console.error('Erro ao buscar triagens:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Triagens Realizadas</h2>
          <p className="text-muted-foreground">Visualize e analise as triagens de disfagia realizadas</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {assessments.length > 0 ? (
              <div className="grid gap-4">
                {assessments.map((assessment) => (
                  <Card key={assessment.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{assessment.patients?.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {assessment.patients?.age} anos • {new Date(assessment.completed_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge 
                          className={
                            assessment.risk_level === 'baixo' ? 'bg-green-100 text-green-800' :
                            assessment.risk_level === 'medio' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }
                        >
                          {assessment.risk_level.charAt(0).toUpperCase() + assessment.risk_level.slice(1)} Risco
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Pontuação Total:</span> {assessment.total_score}
                        </div>
                        <div>
                          <span className="font-medium">Respostas:</span> {assessment.triage_answers?.length || 0} questões
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma triagem encontrada</h3>
                  <p className="text-muted-foreground">Ainda não há triagens realizadas no sistema.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  // Daily Records Component
  const DailyRecordForm = () => {
    const [dailyRecords, setDailyRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetchDailyRecords();
    }, []);

    const fetchDailyRecords = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('daily_records')
          .select(`
            *,
            patients!inner(name, age),
            daily_record_symptoms(symptom_name),
            media_files(file_name, file_url, file_type)
          `)
          .order('record_date', { ascending: false });

        if (error) throw error;
        setDailyRecords(data || []);
      } catch (error) {
        console.error('Erro ao buscar registros diários:', error);
      } finally {
        setLoading(false);
      }
    };

    const getRiskColor = (riskScore) => {
      if (riskScore <= 2) return 'text-green-600';
      if (riskScore <= 4) return 'text-yellow-600';
      return 'text-red-600';
    };

    const getRiskLabel = (riskScore) => {
      if (riskScore <= 2) return 'Baixo';
      if (riskScore <= 4) return 'Médio';
      return 'Alto';
    };

    return (
      <div className="px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Registros Diários</h2>
          <p className="text-muted-foreground">Acompanhe os registros diários dos pacientes</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {dailyRecords.length > 0 ? (
              <div className="grid gap-4">
                {dailyRecords.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{record.patients?.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(record.record_date).toLocaleDateString('pt-BR')} • {record.patients?.age} anos
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${getRiskColor(record.risk_score)}`}>
                            Risco: {getRiskLabel(record.risk_score)} ({record.risk_score})
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Consistência: {record.food_consistency}
                          </div>
                        </div>
                      </div>
                      
                      {record.daily_record_symptoms?.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Sintomas observados:</h4>
                          <div className="flex flex-wrap gap-2">
                            {record.daily_record_symptoms.map((symptom, index) => (
                              <Badge key={index} variant="outline">
                                {symptom.symptom_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.observations && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Observações:</h4>
                          <p className="text-sm text-muted-foreground">{record.observations}</p>
                        </div>
                      )}

                      {record.media_files?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Arquivos anexados:</h4>
                          <div className="flex gap-2">
                            {record.media_files.map((file, index) => (
                              <Badge key={index} variant="secondary">
                                {file.file_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum registro encontrado</h3>
                  <p className="text-muted-foreground">Ainda não há registros diários no sistema.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  // History View Component
  const HistoryView = () => {
    const [historyData, setHistoryData] = useState([]);
    const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState([]);

    useEffect(() => {
      fetchPatients();
      fetchCompleteHistory();
    }, []);

    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('name');

        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
      }
    };

    const fetchCompleteHistory = async () => {
      try {
        setLoading(true);
        
        // Buscar triagens
        const { data: triages, error: triageError } = await supabase
          .from('triage_assessments')
          .select(`
            *,
            patients!inner(name, age)
          `)
          .order('completed_at', { ascending: false });

        // Buscar registros diários
        const { data: records, error: recordError } = await supabase
          .from('daily_records')
          .select(`
            *,
            patients!inner(name, age)
          `)
          .order('record_date', { ascending: false });

        if (triageError) throw triageError;
        if (recordError) throw recordError;

        // Combinar e ordenar por data
        const combined = [
          ...(triages || []).map(t => ({ ...t, type: 'triagem', date: t.completed_at })),
          ...(records || []).map(r => ({ ...r, type: 'registro', date: r.record_date }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setHistoryData(combined);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
      } finally {
        setLoading(false);
      }
    };

    const filteredHistory = selectedPatientHistory 
      ? historyData.filter(item => item.patient_id === selectedPatientHistory)
      : historyData;

    return (
      <div className="px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Histórico Completo</h2>
          <p className="text-muted-foreground">Visualize o histórico completo de triagens e registros</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Filtrar por paciente:</label>
            <select 
              className="border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
              value={selectedPatientHistory || ''}
              onChange={(e) => setSelectedPatientHistory(e.target.value || null)}
            >
              <option value="">Todos os pacientes</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <Card key={`${item.type}-${item.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">{item.patients?.name}</h3>
                          <Badge variant={item.type === 'triagem' ? 'default' : 'secondary'}>
                            {item.type === 'triagem' ? 'Triagem' : 'Registro Diário'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.date).toLocaleDateString('pt-BR')} • {item.patients?.age} anos
                        </p>
                      </div>
                      <div className="text-right">
                        {item.type === 'triagem' ? (
                          <Badge 
                            className={
                              item.risk_level === 'baixo' ? 'bg-green-100 text-green-800' :
                              item.risk_level === 'medio' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }
                          >
                            {item.risk_level.charAt(0).toUpperCase() + item.risk_level.slice(1)} Risco
                          </Badge>
                        ) : (
                          <div className="text-sm">
                            <div className="font-medium">Risco: {item.risk_score}</div>
                            <div className="text-muted-foreground">{item.food_consistency}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {item.type === 'triagem' && (
                      <div className="text-sm text-muted-foreground">
                        Pontuação total: {item.total_score}
                      </div>
                    )}
                    
                    {item.type === 'registro' && item.observations && (
                      <div className="text-sm text-muted-foreground mt-2">
                        <strong>Observações:</strong> {item.observations}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum histórico encontrado</h3>
                  <p className="text-muted-foreground">
                    {selectedPatientHistory 
                      ? 'Não há registros para este paciente.' 
                      : 'Ainda não há registros no sistema.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  const CommunicationView = () => <TeamChat />;

  return <MainDashboard />;
};

export default DisfagiaApp;