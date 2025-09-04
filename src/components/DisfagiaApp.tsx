import React, { useState, useEffect } from 'react';
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
  const { profile, signOut, isAdmin } = useAuth();
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


  const CaregiverDashboard = () => (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">DisfagiaMonitor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {profile?.tipo_usuario === 'fonoaudiologo' ? 'Fonoaudiólogo' : 'Cuidador'}: {profile?.nome}
              </span>
              {isAdmin && (
                <Button 
                  onClick={() => navigate('/admin/usuarios')}
                  variant="ghost"
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
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
        {currentView === 'dashboard' && <CaregiverDashboardContent />}
        {currentView === 'patient-selection' && <PatientSelection />}
        {currentView === 'patient-selection-view' && <PatientSelectionForView />}
        {currentView === 'triagem' && <TriagemForm />}
        {currentView === 'registro' && <DailyRecordForm />}
        {currentView === 'historico' && <HistoryView />}
        {currentView === 'comunicacao' && <CommunicationView />}
      </main>
    </div>
  );

  const CaregiverDashboardContent = () => {
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

        // Format data for charts
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

    // Calculate current status from latest triage or triageData
    const getCurrentStatus = () => {
      const latestTriage = triageHistory[0];
      const currentRisk = latestTriage?.riskLevel || triageData.riskLevel;
      
      if (!currentRisk) return { level: 'Não avaliado', color: 'text-muted-foreground', icon: AlertTriangle };
      
      const statusMap = {
        'baixo': { level: 'Baixo Risco', color: 'text-medical-green', icon: CheckCircle },
        'medio': { level: 'Médio Risco', color: 'text-medical-amber', icon: AlertTriangle },
        'alto': { level: 'Alto Risco', color: 'text-medical-red', icon: AlertTriangle }
      };
      
      return statusMap[triageData.riskLevel] || statusMap['baixo'];
    };

    // Get the latest evaluation date
    const getLastEvaluation = () => {
      const latestTriage = triageHistory[0];
      if (latestTriage) {
        return latestTriage.date;
      }
      if (triageData.date) {
        return new Date(triageData.date).toLocaleDateString('pt-BR');
      }
      return 'Nunca';
    };

    // Calculate risk trend
    const getRiskTrend = () => {
      if (triageHistory.length < 2) return 'stable';
      
      const latest = triageHistory[0]?.risco || 0;
      const previous = triageHistory[1]?.risco || 0;
      
      if (latest > previous) return 'up';
      if (latest < previous) return 'down';
      return 'stable';
    };

    // Get chart data
    const getChartData = () => {
      if (loadingTriageHistory) return [];
      
      if (triageHistory.length > 0) {
        return triageHistory.slice(0, 7).reverse(); // Show last 7 triages
      }
      
      // Fallback to sample data if no triages yet
      return dailyRecords.slice(-7);
    };

    const currentStatus = getCurrentStatus();

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Paciente Selecionado */}
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
                  <currentStatus.icon className={`h-8 w-8 ${currentStatus.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Status Atual</p>
                  <p className={`text-2xl font-semibold ${currentStatus.color}`}>{currentStatus.level}</p>
                  {triageData.totalScore !== undefined && (
                    <p className="text-xs text-muted-foreground">Pontuação: {triageData.totalScore}</p>
                  )}
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
                  <p className="text-2xl font-semibold text-foreground">{getLastEvaluation()}</p>
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
              {loadingTriageHistory ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : getChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={getChartData()}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(value: any) => {
                        const riskLabels: Record<number, string> = { 1: 'Baixo', 2: 'Médio', 3: 'Alto' };
                        return [riskLabels[value] || value, 'Risco'];
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="risco" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Nenhuma triagem realizada ainda</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => {
                    if (!selectedPatient) {
                      toast({
                        title: "Atenção",
                        description: "Selecione um paciente primeiro",
                        variant: "destructive",
                      });
                      return;
                    }
                    setCurrentView('registro');
                  }}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center space-y-2"
                >
                  <Calendar className="h-6 w-6 text-primary" />
                  <span className="text-sm">Registro Diário</span>
                </Button>
                
                <Button 
                  onClick={() => {
                    if (!selectedPatient) {
                      toast({
                        title: "Atenção", 
                        description: "Selecione um paciente primeiro",
                        variant: "destructive",
                      });
                      return;
                    }
                    setCurrentView('patient-selection');
                  }}
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

        {/* Alert for selected patient status */}
        {selectedPatient && getCurrentStatus().level !== 'Não avaliado' && (
          <Card className={`border-l-4 ${
            currentStatus.level === 'Alto Risco' ? 'border-l-red-500 bg-red-50' :
            currentStatus.level === 'Médio Risco' ? 'border-l-yellow-500 bg-yellow-50' :
            'border-l-green-500 bg-green-50'
          }`}>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <currentStatus.icon className={`h-5 w-5 ${currentStatus.color}`} />
                <div>
                  <p className="font-medium">Status atual de {selectedPatient.nome}: {currentStatus.level}</p>
                  <p className="text-sm text-muted-foreground">
                    Última avaliação: {getLastEvaluation()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {!selectedPatient && (
          <Card className="border-l-4 border-l-blue-500 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Selecione um paciente</p>
                  <p className="text-sm text-muted-foreground">
                    Escolha um paciente para ver seu status e realizar avaliações
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const PatientSelectionForView = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
      fetchPatients();
    }, []);

    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('pacientes', {
          method: 'GET'
        });

        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar lista de pacientes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const handleSelectPatient = (patient: any) => {
      setSelectedPatient(patient);
      setCurrentView('dashboard');
      toast({
        title: "Paciente selecionado",
        description: `${patient.nome} selecionado para visualização da evolução`,
        duration: 3000,
      });
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando pacientes...</p>
          </div>
        </div>
      );
    }

    if (patients.length === 0) {
      return (
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum paciente cadastrado</h2>
                <p className="text-muted-foreground mb-6">
                  Para visualizar a evolução, você precisa cadastrar pelo menos um paciente.
                </p>
                <div className="space-x-4">
                  <Button onClick={() => navigate('/pacientes')}>
                    Cadastrar Paciente
                  </Button>
                  <Button 
                    onClick={() => setCurrentView('dashboard')}
                    variant="outline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              onClick={() => setCurrentView('dashboard')}
              variant="ghost"
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Selecionar Paciente</h1>
            <p className="text-muted-foreground">Escolha qual paciente deseja visualizar a evolução de risco</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {patients.map((patient: any) => (
              <Card key={patient.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{patient.nome}</h3>
                        {patient.data_nascimento && (
                          <p className="text-sm text-muted-foreground">
                            {new Date().getFullYear() - new Date(patient.data_nascimento).getFullYear()} anos
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {patient.diagnostico && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-foreground mb-1">Diagnóstico:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{patient.diagnostico}</p>
                    </div>
                  )}

                  <Button 
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Ver Evolução
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const PatientSelection = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
      fetchPatients();
    }, []);

    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('pacientes', {
          method: 'GET'
        });

        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar lista de pacientes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const handleSelectPatient = (patient: any) => {
      setSelectedPatient(patient);
      setCurrentView('triagem');
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando pacientes...</p>
          </div>
        </div>
      );
    }

    if (patients.length === 0) {
      return (
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum paciente cadastrado</h2>
                <p className="text-muted-foreground mb-6">
                  Para realizar uma triagem, você precisa cadastrar pelo menos um paciente.
                </p>
                <div className="space-x-4">
                  <Button onClick={() => navigate('/pacientes')}>
                    Cadastrar Paciente
                  </Button>
                  <Button 
                    onClick={() => setCurrentView('dashboard')}
                    variant="outline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              onClick={() => setCurrentView('dashboard')}
              variant="ghost"
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Selecionar Paciente para Triagem</h1>
            <p className="text-muted-foreground">Escolha qual paciente deseja realizar a triagem de disfagia</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {patients.map((patient: any) => (
              <Card key={patient.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{patient.nome}</h3>
                        {patient.data_nascimento && (
                          <p className="text-sm text-muted-foreground">
                            {new Date().getFullYear() - new Date(patient.data_nascimento).getFullYear()} anos
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {patient.diagnostico && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-foreground mb-1">Diagnóstico:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{patient.diagnostico}</p>
                    </div>
                  )}

                  <Button 
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full"
                  >
                    Iniciar Triagem
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const TriagemForm = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const { toast } = useToast();

    if (!selectedPatient) {
      setCurrentView('patient-selection');
      return null;
    }

    const questions = [
      {
        id: 'tosse',
        question: 'O paciente tosse ou engasga durante ou após as refeições?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Raramente' },
          { value: 2, label: 'Às vezes' },
          { value: 3, label: 'Frequentemente' },
          { value: 4, label: 'Sempre' }
        ]
      },
      {
        id: 'voz',
        question: 'A voz fica molhada ou rouca após comer ou beber?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Raramente' },
          { value: 2, label: 'Às vezes' },
          { value: 3, label: 'Frequentemente' },
          { value: 4, label: 'Sempre' }
        ]
      },
      {
        id: 'escape',
        question: 'Há escape de alimento ou líquido pela boca durante a alimentação?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Raramente' },
          { value: 2, label: 'Às vezes' },
          { value: 3, label: 'Frequentemente' },
          { value: 4, label: 'Sempre' }
        ]
      },
      {
        id: 'deglutir',
        question: 'O paciente precisa fazer esforço ou múltiplas tentativas para engolir?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Raramente' },
          { value: 2, label: 'Às vezes' },
          { value: 3, label: 'Frequentemente' },
          { value: 4, label: 'Sempre' }
        ]
      },
      {
        id: 'pneumonia',
        question: 'O paciente teve pneumonia recorrente nos últimos 6 meses?',
        options: [
          { value: 0, label: 'Não' },
          { value: 4, label: 'Sim' }
        ]
      }
    ];

    const handleAnswer = async (value: number) => {
      const newAnswers = { ...answers, [questions[currentQuestion].id]: value };
      setAnswers(newAnswers);

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // Calcular score
        const totalScore = Object.values(newAnswers).reduce((sum, val) => sum + val, 0);
        let riskLevel: 'baixo' | 'medio' | 'alto' = 'baixo';
        
        if (totalScore >= 12) {
          riskLevel = 'alto';
        } else if (totalScore >= 6) {
          riskLevel = 'medio';
        }

        // Save the result to database
        try {
          // Create triage assessment
          const { data: assessment, error: assessmentError } = await supabase
            .from('triage_assessments')
            .insert({
              patient_id: selectedPatient.id,
              caregiver_id: profile?.id,
              total_score: totalScore,
              risk_level: riskLevel
            })
            .select()
            .single();

          if (assessmentError) throw assessmentError;

          // Save answers
          const answersToInsert = Object.entries(newAnswers).map(([question_id, answer_value]) => ({
            assessment_id: assessment.id,
            question_id,
            answer_value
          }));

          const { error: answersError } = await supabase
            .from('triage_answers')
            .insert(answersToInsert);

          if (answersError) throw answersError;

          // Update patient's current risk level if patients table exists
          try {
            const { error: patientError } = await supabase
              .from('patients')
              .update({ current_risk_level: riskLevel })
              .eq('id', selectedPatient.id);
            
            // Ignore error if patients table doesn't exist or patient not found
            if (patientError) console.warn('Could not update patient risk level:', patientError);
          } catch (err) {
            console.warn('Patients table may not exist:', err);
          }

          setTriageData({ totalScore, riskLevel, answers: newAnswers, date: new Date().toISOString(), patient: selectedPatient });

          toast({
            title: "Triagem concluída e salva!",
            description: `Paciente: ${selectedPatient.nome} - Pontuação: ${totalScore} - Nível de risco: ${riskLevel}`,
            duration: 4000,
          });
        } catch (error) {
          console.error('Erro ao salvar triagem:', error);
          toast({
            title: "Erro",
            description: "Erro ao salvar triagem no banco de dados",
            variant: "destructive",
          });
          return;
        }
        
        setCurrentView('dashboard');
      }
    };

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Triagem de Disfagia</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Paciente: <span className="font-medium">{selectedPatient.nome}</span>
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Pergunta {currentQuestion + 1} de {questions.length}
                    </span>
                  </div>
                  <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2" />
                </div>

              <div className="mb-8">
                <h3 className="text-lg font-medium text-foreground mb-6">
                  {questions[currentQuestion].question}
                </h3>
                
                <div className="space-y-3">
                  {questions[currentQuestion].options.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => handleAnswer(option.value)}
                      variant="outline"
                      className="w-full justify-start h-auto p-4 text-left"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {currentQuestion > 0 && (
                <Button
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  variant="ghost"
                  className="mr-4"
                >
                  ← Pergunta anterior
                </Button>
              )}
              <Button
                onClick={() => {
                  setSelectedPatient(null);
                  setCurrentView('patient-selection');
                }}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Trocar Paciente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const DailyRecordForm = () => {
    const [formData, setFormData] = useState({
      sintomas: [] as string[],
      consistencia: '',
      observacoes: '',
      videoFile: null,
      photoFile: null
    });
    const { toast } = useToast();

    const sintomas = [
      'Tosse durante alimentação',
      'Engasgo',
      'Voz molhada após comer',
      'Escape de alimento pela boca',
      'Dificuldade para engolir',
      'Recusa alimentar',
      'Demora excessiva para comer'
    ];

    const consistencias = [
      'Normal',
      'Pastosa',
      'Líquida modificada',
      'Líquida fina'
    ];

    const handleSubmit = () => {
      // Save daily record
      const newRecord = {
        date: new Date().toISOString().split('T')[0],
        sintomas: formData.sintomas.length,
        consistencia: formData.consistencia,
        observacoes: formData.observacoes,
        risco: Math.min(4, Math.floor(formData.sintomas.length / 2))
      };
      
      setDailyRecords(prev => [...prev, newRecord]);
      
      toast({
        title: "Registro salvo!",
        description: "Registro diário salvo com sucesso.",
        duration: 3000,
      });
      
      setCurrentView('dashboard');
    };

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Registro Diário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Sintomas observados hoje (marque todos que se aplicam):
                </Label>
                <div className="space-y-3">
                  {sintomas.map((sintoma) => (
                    <div key={sintoma} className="flex items-center space-x-2">
                      <Checkbox
                        id={sintoma}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({...formData, sintomas: [...formData.sintomas, sintoma]});
                          } else {
                            setFormData({...formData, sintomas: formData.sintomas.filter(s => s !== sintoma)});
                          }
                        }}
                      />
                      <Label htmlFor={sintoma} className="text-sm">{sintoma}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">
                  Consistência dos alimentos oferecidos:
                </Label>
                <RadioGroup 
                  value={formData.consistencia} 
                  onValueChange={(value) => setFormData({...formData, consistencia: value})}
                >
                  {consistencias.map((consistencia) => (
                    <div key={consistencia} className="flex items-center space-x-2">
                      <RadioGroupItem value={consistencia} id={consistencia} />
                      <Label htmlFor={consistencia} className="text-sm">{consistencia}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="observacoes" className="text-base font-medium mb-2 block">
                  Observações adicionais:
                </Label>
                <Textarea
                  id="observacoes"
                  rows={4}
                  placeholder="Descreva qualquer comportamento ou situação relevante..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-medium mb-2 block">
                    Vídeo da alimentação (opcional):
                  </Label>
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Toque para gravar vídeo</p>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium mb-2 block">
                    Foto do prato (opcional):
                  </Label>
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Toque para tirar foto</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                >
                  Salvar Registro
                </Button>
                <Button
                  onClick={() => setCurrentView('dashboard')}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const HistoryView = () => {
    const [availablePatients, setAvailablePatients] = useState([]);
    const [selectedHistoryPatient, setSelectedHistoryPatient] = useState(null);
    const [patientHistoryData, setPatientHistoryData] = useState([]);
    const [triageHistory, setTriageHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
      fetchAvailablePatients();
    }, []);

    useEffect(() => {
      if (selectedHistoryPatient) {
        fetchPatientHistory(selectedHistoryPatient.id);
      }
    }, [selectedHistoryPatient]);

    const fetchAvailablePatients = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('pacientes', {
          method: 'GET'
        });

        if (error) throw error;
        setAvailablePatients(data || []);
        if (data && data.length > 0) {
          setSelectedHistoryPatient(data[0]);
        }
      } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar lista de pacientes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchPatientHistory = async (patientId: string) => {
      try {
        // Buscar registros diários
        const { data: dailyData, error: dailyError } = await supabase
          .from('daily_records')
          .select('*')
          .eq('patient_id', patientId)
          .order('record_date', { ascending: true });

        if (dailyError) throw dailyError;

        // Buscar avaliações de triagem
        const { data: triageData, error: triageError } = await supabase
          .from('triage_assessments')
          .select('*')
          .eq('patient_id', patientId)
          .order('completed_at', { ascending: true });

        if (triageError) throw triageError;

        // Processar dados para os gráficos
        const processedDailyData = (dailyData || []).map(record => ({
          date: record.record_date,
          risco: record.risk_score,
          consistencia: record.food_consistency,
          observacoes: record.observations
        }));

        const processedTriageData = (triageData || []).map(assessment => ({
          date: new Date(assessment.completed_at).toISOString().split('T')[0],
          risco: assessment.total_score,
          nivel: assessment.risk_level
        }));

        setPatientHistoryData(processedDailyData);
        setTriageHistory(processedTriageData);
      } catch (error) {
        console.error('Erro ao carregar histórico do paciente:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar histórico do paciente",
          variant: "destructive",
        });
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando histórico...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-6 sm:px-0">
        {/* Seleção de Paciente */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Selecionar Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePatients.map((patient) => (
                <Card 
                  key={patient.id} 
                  className={`cursor-pointer transition-all ${
                    selectedHistoryPatient?.id === patient.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedHistoryPatient(patient)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{patient.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient.data_nascimento ? 
                            `${Math.floor((new Date().getTime() - new Date(patient.data_nascimento).getTime()) / (1000 * 60 * 60 * 24 * 365))} anos` 
                            : 'Idade não informada'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedHistoryPatient && (
          <>
            {/* Histórico do Paciente Selecionado */}
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="text-2xl">
                  Histórico de Evolução - {selectedHistoryPatient.nome}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientHistoryData.length > 0 || triageHistory.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-4">Avaliações de Triagem</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={triageHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                          />
                          <YAxis domain={[0, 'dataMax + 5']} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value as string).toLocaleDateString()}
                            formatter={(value, name) => [
                              `${value} pontos`, 
                              name === 'risco' ? 'Pontuação Total' : name
                            ]}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="risco" 
                            stroke="#ef4444" 
                            strokeWidth={2} 
                            name="Pontuação de Risco" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-4">Registros Diários</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={patientHistoryData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).getDate().toString()} 
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value as string).toLocaleDateString()}
                            formatter={(value, name) => [
                              `${value} pontos`, 
                              name === 'risco' ? 'Pontuação de Risco' : name
                            ]}
                          />
                          <Bar 
                            dataKey="risco" 
                            fill="hsl(var(--primary))" 
                            name="Pontuação de Risco" 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      Nenhum dado histórico encontrado para {selectedHistoryPatient.nome}
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                      Realize avaliações de triagem e registros diários para visualizar o histórico.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Registros Recentes */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Registros Recentes - {selectedHistoryPatient.nome}</CardTitle>
              </CardHeader>
              <CardContent>
                {patientHistoryData.length > 0 ? (
                  <div className="space-y-4">
                    {patientHistoryData.slice(-5).reverse().map((record, index) => (
                      <Card key={index} className="border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">
                                {new Date(record.date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Consistência: {record.consistencia || 'Não informado'}
                              </p>
                              {record.observacoes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Observações: {record.observacoes}
                                </p>
                              )}
                            </div>
                            <Badge 
                              variant={
                                record.risco <= 5 ? "default" :
                                record.risco <= 10 ? "secondary" : "destructive"
                              }
                              className={
                                record.risco <= 5 ? 'bg-medical-green text-medical-green-foreground' :
                                record.risco <= 10 ? 'bg-medical-amber text-medical-amber-foreground' :
                                'bg-medical-red text-medical-red-foreground'
                              }
                            >
                              {record.risco <= 5 ? 'Baixo Risco' :
                               record.risco <= 10 ? 'Médio Risco' : 'Alto Risco'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum registro encontrado para {selectedHistoryPatient.nome}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  };

  const CommunicationView = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Comunicação com Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="border rounded-lg h-96 p-4 mb-4 overflow-y-auto bg-muted/30">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-medical-green rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-medical-green-foreground" />
                      </div>
                      <Card className="flex-1">
                        <CardContent className="p-3">
                          <p className="text-sm font-medium text-foreground">Dra. Fernanda (Fonoaudióloga)</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Olá Ana! Vi que o João teve alguns episódios de tosse ontem. Como ele está hoje?
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Hoje, 09:30</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex items-start space-x-3 justify-end">
                      <Card className="bg-primary text-primary-foreground max-w-xs">
                        <CardContent className="p-3">
                          <p className="text-sm">
                            Bom dia, Doutora! Hoje ele está melhor. Ofereci a papinha pastosa como orientado e não houve tosse.
                          </p>
                          <p className="text-xs text-primary-foreground/70 mt-1">Hoje, 10:15</p>
                        </CardContent>
                      </Card>
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-medical-green rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-medical-green-foreground" />
                      </div>
                      <Card className="flex-1">
                        <CardContent className="p-3">
                          <p className="text-sm font-medium text-foreground">Dra. Fernanda</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Ótimo! Continue com a consistência pastosa por mais 3 dias. Se não houver sintomas, podemos tentar alimentos mais sólidos.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Hoje, 10:45</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                  />
                  <Button>
                    Enviar
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-primary mb-2">Profissional Responsável</h4>
                    <p className="text-sm text-foreground">Dra. Fernanda Silva</p>
                    <p className="text-sm text-muted-foreground">CRFa 12345-SP</p>
                    <p className="text-sm text-muted-foreground">Fonoaudióloga</p>
                  </CardContent>
                </Card>

                <Card className="bg-medical-amber-light border-medical-amber/20">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-medical-amber mb-2">Próxima Consulta</h4>
                    <p className="text-sm text-foreground">25 de Agosto, 2025</p>
                    <p className="text-sm text-muted-foreground">14:30 - Teleconsulta</p>
                  </CardContent>
                </Card>

                <Button className="w-full bg-medical-green hover:bg-medical-green/90">
                  Agendar Consulta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const ProfessionalDashboard = () => (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-medical-green rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-medical-green-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">DisfagiaMonitor Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Dra. Fernanda Silva - CRFa 12345-SP</span>
              <Button 
                onClick={() => setCurrentView('login')}
                variant="ghost"
                size="sm"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
                    <AlertTriangle className="h-8 w-8 text-medical-red" />
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
                    <MessageCircle className="h-8 w-8 text-medical-green" />
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
                              patient.riskLevel === 'baixo' ? 'bg-medical-green text-medical-green-foreground' :
                              patient.riskLevel === 'médio' ? 'bg-medical-amber text-medical-amber-foreground' :
                              'bg-medical-red text-medical-red-foreground'
                            }
                          >
                            {patient.riskLevel}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button variant="link" size="sm" className="text-primary">Ver Detalhes</Button>
                          <Button variant="link" size="sm" className="text-medical-green">Mensagem</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );

  if (profile?.tipo_usuario === 'fonoaudiologo') {
    return <ProfessionalDashboard />;
  }

  return <CaregiverDashboard />;
};

export default DisfagiaApp;