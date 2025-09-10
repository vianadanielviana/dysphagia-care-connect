import React, { useState, useEffect } from 'react';
import TeamChat from './TeamChat';
import TriageForm from './TriageForm';
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
import PhotoCapture from '@/components/PhotoCapture';

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
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img src="/lovable-uploads/4fc3d8d5-aa4a-4c2c-9b26-e7162b91a5b6.png" alt="Gama Logo" className="h-6 w-6 sm:h-8 sm:w-8" />
              <h1 className="text-sm lg:text-lg xl:text-xl font-normal text-foreground truncate">Gama - Soluções em Saúde</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:inline text-sm text-muted-foreground truncate">
                {profile?.tipo_usuario === 'fonoaudiologo' ? 'Fonoaudiólogo' : 'Cuidador'}: {profile?.nome}
              </span>
              <span className="sm:hidden text-xs text-muted-foreground">
                {profile?.nome?.split(' ')[0]}
              </span>
              {isAdmin && (
                <Button 
                  onClick={() => navigate('/admin/usuarios')}
                  variant="ghost"
                  size="sm"
                  className="p-2 sm:px-3"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:ml-2 sm:inline">Admin</span>
                </Button>
              )}
              <Button 
                onClick={signOut}
                variant="ghost"
                size="sm"
                className="p-2 sm:px-3"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:ml-2 sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto scrollbar-hide py-1">
            {['dashboard', 'radi', 'registro', 'historico', 'comunicacao'].map((view) => (
              <Button
                key={view}
                onClick={() => {
                  if (view === 'radi') {
                    setCurrentView('patient-selection');
                  } else if (view === 'registro') {
                    setCurrentView('patient-selection-registro');
                  } else {
                    setCurrentView(view);
                  }
                }}
                variant="ghost"
                className={`rounded-none border-b-2 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm flex-shrink-0 ${
                  currentView === view 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                {view === 'dashboard' && 'Resumo'}
                {view === 'radi' && 'RaDI'}
                {view === 'registro' && <span className="hidden sm:inline">Registro Diário</span>}
                {view === 'registro' && <span className="sm:hidden">Registro</span>}
                {view === 'historico' && 'Histórico'}
                {view === 'comunicacao' && <span className="hidden sm:inline">Comunicação</span>}
                {view === 'comunicacao' && <span className="sm:hidden">Chat</span>}
              </Button>
            ))}
            <Button
              onClick={() => navigate('/pacientes')}
              variant="ghost"
              className="rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm flex-shrink-0"
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
        {currentView === 'patient-selection-registro' && <PatientSelectionForRegistro />}
        {currentView === 'radi' && selectedPatient && (
          <TriageForm
            patient={selectedPatient}
            onComplete={(data) => {
              setTriageData(data);
              setCurrentView('dashboard');
            }}
            onBack={() => setCurrentView('patient-selection')}
          />
        )}
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
        console.error('Erro ao buscar histórico de RaDI:', error);
      } finally {
        setLoadingTriageHistory(false);
      }
    };

    // Calculate current status from latest RaDI or triageData
    const getCurrentStatus = () => {
      const latestRaDI = triageHistory[0];
      const currentRisk = latestRaDI?.riskLevel || triageData.riskLevel;
      
      if (!currentRisk) return { level: 'Não avaliado', color: 'text-muted-foreground', icon: AlertTriangle };
      
      const statusMap = {
        'normal': { level: 'Sem Sintomas', color: 'text-medical-green', icon: CheckCircle },
        'alerta': { level: 'Presença de Sintomas', color: 'text-medical-amber', icon: AlertTriangle },
        'baixo': { level: 'Sem Sintomas', color: 'text-medical-green', icon: CheckCircle },
        'medio': { level: 'Presença de Sintomas', color: 'text-medical-amber', icon: AlertTriangle },
        'alto': { level: 'Presença de Sintomas', color: 'text-medical-amber', icon: AlertTriangle }
      };
      
      return statusMap[triageData.riskLevel] || statusMap['baixo'];
    };

    // Get the latest evaluation date
    const getLastEvaluation = () => {
      const latestRaDI = triageHistory[0];
      if (latestRaDI) {
        return latestRaDI.date;
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
        return triageHistory.slice(0, 7).reverse(); // Show last 7 RaDI
      }
      
      // Fallback to sample data if no RaDI yet
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
              <CardTitle className="text-base">Evolução de Sintomas (Últimos RaDI)</CardTitle>
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
                        return [value, 'Pontuação'];
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pontuacao" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Nenhum RaDI realizado ainda</p>
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
                  onClick={() => setCurrentView('patient-selection')}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center space-y-2"
                >
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="text-sm">Novo RaDI</span>
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
          <Card className="border-l-4 border-l-primary bg-accent">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Selecione um paciente</p>
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
      setCurrentView('registro');
      toast({
        title: "Paciente selecionado",
        description: `${patient.nome} selecionado para registro diário`,
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

  const PatientSelectionForRegistro = () => {
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
      setCurrentView('registro');
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
                  Para realizar um registro diário, você precisa cadastrar pelo menos um paciente.
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
            <h1 className="text-3xl font-bold text-foreground">Selecionar Paciente para Registro Diário</h1>
            <p className="text-muted-foreground">Escolha qual paciente deseja realizar o registro diário</p>
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
                      <p className="text-sm text-muted-foreground">
                        <strong>Diagnóstico:</strong> {patient.diagnostico}
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Iniciar Registro Diário
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
      setCurrentView('radi');
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
                  Para realizar um RaDI, você precisa cadastrar pelo menos um paciente.
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
            <h1 className="text-3xl font-bold text-foreground">Selecionar Paciente para RaDI</h1>
            <p className="text-muted-foreground">Escolha qual paciente deseja realizar o RaDI de disfagia</p>
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
                        Iniciar RaDI
                      </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };


  const DailyRecordForm = () => {
    const [formData, setFormData] = useState({
      sintomas: [] as string[],
      consistencia: 'normal' as 'liquida_fina' | 'pastosa' | 'normal',
      observacoes: '',
    });
    const [photoUrls, setPhotoUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const sintomas = [
      { id: 'tosse', label: 'Tosse durante alimentação', icon: '🤧' },
      { id: 'engasgo', label: 'Engasgo', icon: '😵' },
      { id: 'voz_molhada', label: 'Voz molhada após comer', icon: '🗣️' },
      { id: 'escape_alimento', label: 'Escape de alimento pela boca', icon: '🍽️' },
      { id: 'dificuldade_engolir', label: 'Dificuldade para engolir', icon: '⏱️' },
      { id: 'recusa_alimentar', label: 'Recusa alimentar', icon: '🚫' },
      { id: 'demora_excessiva', label: 'Demora excessiva para comer', icon: '😴' }
    ];

    const consistencias = [
      { 
        value: 'normal', 
        label: 'Normal', 
        description: 'Sólidos, dieta regular',
        color: 'bg-green-100 text-green-800'
      },
      { 
        value: 'pastosa', 
        label: 'Pastoso', 
        description: 'Purês, vitaminas, sopas',
        color: 'bg-orange-100 text-orange-800'
      },
      { 
        value: 'liquida_fina', 
        label: 'Líquido', 
        description: 'Água, sucos, chás',
        color: 'bg-blue-100 text-blue-800'
      }
    ];

    const calculateRiskScore = () => {
      const highRiskSymptoms = ['tosse', 'engasgo', 'voz_molhada'];
      const mediumRiskSymptoms = ['escape_alimento', 'dificuldade_engolir', 'recusa_alimentar'];
      
      let score = 0;
      formData.sintomas.forEach(symptom => {
        if (highRiskSymptoms.includes(symptom)) {
          score += 3;
        } else if (mediumRiskSymptoms.includes(symptom)) {
          score += 2;
        } else {
          score += 1;
        }
      });

      if (formData.consistencia === 'liquida_fina') score += 1;
      return score;
    };

    const getRiskLevel = (score: number) => {
      if (score === 0) return { level: 'normal', label: 'Sem Sintomas', color: 'text-medical-green' };
      return { level: 'alerta', label: 'Presença de Sintomas', color: 'text-medical-amber' };
    };

    const handleSubmit = async () => {
      if (!selectedPatient) {
        toast({
          title: "Erro",
          description: "Selecione um paciente primeiro.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      try {
        const riskScore = calculateRiskScore();
        const riskLevel = getRiskLevel(riskScore);

        // Save daily record
        const { data: record, error: recordError } = await supabase
          .from('daily_records')
          .insert({
            patient_id: selectedPatient.id,
            caregiver_id: (await supabase.auth.getUser()).data.user?.id,
            record_date: new Date().toISOString().split('T')[0],
            food_consistency: formData.consistencia,
            observations: formData.observacoes,
            risk_score: riskScore,
            photo_urls: photoUrls
          })
          .select()
          .single();

        if (recordError) throw recordError;

        // Save symptoms
        if (formData.sintomas.length > 0) {
          const symptomsToSave = formData.sintomas.map(symptomId => ({
            daily_record_id: record.id,
            symptom_name: sintomas.find(s => s.id === symptomId)?.label || symptomId
          }));

          const { error: symptomsError } = await supabase
            .from('daily_record_symptoms')
            .insert(symptomsToSave);

          if (symptomsError) throw symptomsError;
        }

        toast({
          title: "Registro salvo!",
          description: `Registro diário salvo com sucesso. Nível de risco: ${riskLevel.label}`,
        });
        
        setCurrentView('dashboard');

        // Reset form
        setFormData({
          sintomas: [],
          consistencia: 'normal',
          observacoes: '',
        });
        setPhotoUrls([]);

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

    if (!selectedPatient) {
      return (
        <div className="px-4 py-6 sm:px-0 text-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">Nenhum paciente selecionado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um paciente para fazer o registro diário
              </p>
              <Button onClick={() => setCurrentView('patient-selection-registro')}>
                Selecionar Paciente
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    const riskScore = calculateRiskScore();
    const riskLevel = getRiskLevel(riskScore);

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl flex items-center">
                    <Calendar className="h-6 w-6 mr-2" />
                    Registro Diário
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Paciente: <span className="font-medium">{selectedPatient.nome}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Button
                  onClick={() => setCurrentView('patient-selection-registro')}
                  variant="outline"
                  size="sm"
                >
                  Trocar Paciente
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sintomas */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Sintomas observados hoje (marque todos que se aplicam):
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sintomas.map((sintoma) => (
                    <div key={sintoma.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={sintoma.id}
                        checked={formData.sintomas.includes(sintoma.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({...formData, sintomas: [...formData.sintomas, sintoma.id]});
                          } else {
                            setFormData({...formData, sintomas: formData.sintomas.filter(s => s !== sintoma.id)});
                          }
                        }}
                      />
                      <Label htmlFor={sintoma.id} className="flex items-center space-x-2 cursor-pointer">
                        <span className="text-lg">{sintoma.icon}</span>
                        <span className="text-sm">{sintoma.label}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consistência */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Consistência dos alimentos oferecidos:
                </Label>
                <RadioGroup 
                  value={formData.consistencia} 
                  onValueChange={(value: any) => setFormData({...formData, consistencia: value})}
                >
                  {consistencias.map((consistencia) => (
                    <div key={consistencia.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={consistencia.value} id={consistencia.value} />
                      <Label htmlFor={consistencia.value} className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{consistencia.label}</span>
                          <Badge className={consistencia.color}>{consistencia.description}</Badge>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Observações */}
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

              {/* Photo Capture */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Fotos da alimentação (opcional):
                </Label>
                <PhotoCapture 
                  onPhotosChange={setPhotoUrls}
                  maxPhotos={3}
                />
              </div>

              {/* Risk Preview */}
              {(formData.sintomas.length > 0 || riskScore > 0) && (
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

              <div className="flex justify-between space-x-4">
                <Button
                  onClick={() => {
                    setSelectedPatient(null);
                    setCurrentView('patient-selection-view');
                  }}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Trocar Paciente
                </Button>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setCurrentView('dashboard')}
                    variant="outline"
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !selectedPatient}
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Salvar Registro
                      </>
                    )}
                  </Button>
                </div>
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

        // Buscar avaliações de RaDI
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
          observacoes: record.observations,
          photo_urls: record.photo_urls || []
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
                      <h3 className="text-lg font-medium text-foreground mb-4">Avaliações de RaDI</h3>
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
                      Realize avaliações de RaDI e registros diários para visualizar o histórico.
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
                           <div className="flex justify-between items-start mb-3">
                             <div className="flex-1">
                               <p className="font-medium text-foreground">
                                 {new Date(record.date).toLocaleDateString('pt-BR')}
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
                                 record.risco <= 3 ? "default" :
                                 record.risco <= 6 ? "secondary" : "destructive"
                               }
                               className={
                                 record.risco <= 3 ? 'bg-medical-green text-medical-green-foreground' :
                                 record.risco <= 6 ? 'bg-medical-amber text-medical-amber-foreground' :
                                 'bg-medical-red text-medical-red-foreground'
                               }
                             >
                               {record.risco <= 3 ? 'Baixo Risco' :
                                record.risco <= 6 ? 'Médio Risco' : 'Alto Risco'}
                             </Badge>
                           </div>
                           
                           {/* Exibir fotos se existirem */}
                           {record.photo_urls && record.photo_urls.length > 0 && (
                             <div className="mt-3">
                               <p className="text-sm font-medium mb-2">Fotos do registro:</p>
                               <div className="flex space-x-2 overflow-x-auto">
                                 {record.photo_urls.map((photoUrl: string, photoIndex: number) => (
                                   <img
                                     key={photoIndex}
                                     src={photoUrl}
                                     alt={`Foto ${photoIndex + 1}`}
                                     className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:scale-110 transition-transform"
                                     onClick={() => window.open(photoUrl, '_blank')}
                                   />
                                 ))}
                               </div>
                             </div>
                           )}
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

  const CommunicationView = () => <TeamChat />;

  const ProfessionalDashboard = () => (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src="/lovable-uploads/4fc3d8d5-aa4a-4c2c-9b26-e7162b91a5b6.png" alt="Gama Logo" className="h-8 w-8" />
              <h1 className="text-xl font-semibold text-foreground">Gama - Soluções em Saúde Pro</h1>
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

  return <CaregiverDashboard />;
};

export default DisfagiaApp;