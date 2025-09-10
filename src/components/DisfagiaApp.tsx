import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  MessageSquare, 
  BarChart3, 
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import TriageForm from '@/components/TriageForm';
import DailyRecordForm from '@/components/DailyRecordForm';
import HistoryView from '@/components/HistoryView';
import CommunicationView from '@/components/CommunicationView';
import PacientesManager from '@/components/PacientesManager';

interface TriageData {
  totalScore: number;
  riskLevel: string;
  answers: Record<string, number>;
  date: string;
  patient: any;
}

const DisfagiaApp = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const { user, profile } = useAuth();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <CaregiverDashboard />;
      case 'patient-selection':
        return <PatientSelection />;
      case 'patient-selection-registro':
        return <PatientSelectionForRegistro />;
      case 'patient-selection-view':
        return <PatientSelectionForView />;
      case 'triage':
        return (
          <TriageForm
            patient={selectedPatient}
            onComplete={(data) => {
              console.log('RaDI completado:', data);
              setCurrentView('dashboard');
            }}
            onBack={() => setCurrentView('patient-selection')}
          />
        );
      case 'registro':
        return (
          <DailyRecordForm
            patient={selectedPatient}
            onComplete={() => setCurrentView('dashboard')}
            onBack={() => setCurrentView('patient-selection-registro')}
          />
        );
      case 'historico':
        return <HistoryView selectedPatient={selectedPatient} />;
      case 'comunicacao':
        return <CommunicationView />;
      case 'pacientes':
        return <PacientesManager />;
      default:
        return <CaregiverDashboard />;
    }
  };

  const CaregiverDashboard = () => {
    const [dashboardData, setDashboardData] = useState({
      totalPatients: 0,
      recentTriages: [],
      riskTrends: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
      try {
        // Buscar pacientes do usuário
        const { data: patientsData, error: patientsError } = await supabase.functions.invoke('pacientes', {
          method: 'GET'
        });

        if (patientsError) throw patientsError;

        const patients = patientsData || [];
        
        // Buscar últimas avaliações
        const { data: triageData, error: triageError } = await supabase
          .from('triage_assessments')
          .select('*, pacientes!inner(nome)')
          .order('completed_at', { ascending: false })
          .limit(5);

        if (triageError) throw triageError;

        // Preparar dados para o gráfico de tendências
        const riskTrends = (triageData || []).map(assessment => ({
          date: new Date(assessment.completed_at).toLocaleDateString('pt-BR'),
          score: assessment.total_score,
          patient: assessment.pacientes?.nome || 'Paciente'
        }));

        setDashboardData({
          totalPatients: patients.length,
          recentTriages: triageData || [],
          riskTrends: riskTrends.reverse()
        });

      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard - Cuidador</h1>
            <p className="text-muted-foreground mt-2">
              Olá, {profile?.nome || user?.email}. Bem-vindo ao sistema de disfagia.
            </p>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
              onClick={() => setCurrentView('patient-selection')}
            >
              <CardContent className="p-6 text-center">
                <ClipboardList className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900 mb-1">RaDI</h3>
                <p className="text-xs text-blue-700">Avaliação de disfagia</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100 border-green-200"
              onClick={() => setCurrentView('patient-selection-registro')}
            >
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-900 mb-1">Registro</h3>
                <p className="text-xs text-green-700">Acompanhamento diário</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
              onClick={() => setCurrentView('patient-selection-view')}
            >
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-900 mb-1">Histórico</h3>
                <p className="text-xs text-purple-700">Ver evolução</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
              onClick={() => setCurrentView('comunicacao')}
            >
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <h3 className="font-semibold text-orange-900 mb-1">Comunicação</h3>
                <p className="text-xs text-orange-700">Chat da equipe</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200"
              onClick={() => setCurrentView('pacientes')}
            >
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                <h3 className="font-semibold text-teal-900 mb-1">Pacientes</h3>
                <p className="text-xs text-teal-700">Gerenciar pacientes</p>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Pacientes</p>
                    <p className="text-3xl font-bold text-primary">{dashboardData.totalPatients}</p>
                  </div>
                  <Users className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avaliações Este Mês</p>
                    <p className="text-3xl font-bold text-primary">{dashboardData.recentTriages.length}</p>
                  </div>
                  <ClipboardList className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold text-green-600">Ativo</p>
                  </div>
                  <Activity className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Triages */}
          {dashboardData.recentTriages.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Últimas Avaliações RaDI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentTriages.map((triage, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{triage.pacientes?.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(triage.completed_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          triage.risk_level === 'alto' ? 'destructive' :
                          triage.risk_level === 'medio' ? 'default' : 'secondary'
                        }>
                          {triage.risk_level === 'alto' ? 'Alto Risco' :
                           triage.risk_level === 'medio' ? 'Médio Risco' : 'Baixo Risco'}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Score: {triage.total_score}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Trends Chart */}
          {dashboardData.riskTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tendência de Risco</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.riskTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
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

    const handlePatientSelect = (patient) => {
      setSelectedPatient(patient);
      setCurrentView('triage');
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

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center">
                <ClipboardList className="h-6 w-6 mr-2" />
                Selecionar Paciente para RaDI
              </CardTitle>
              <p className="text-muted-foreground">
                Escolha o paciente para realizar a avaliação de disfagia
              </p>
            </CardHeader>
            <CardContent>
              {patients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Nenhum paciente encontrado</p>
                  <p className="text-muted-foreground mb-4">
                    Você precisa ter pacientes cadastrados para realizar avaliações
                  </p>
                  <Button onClick={() => setCurrentView('pacientes')}>
                    Gerenciar Pacientes
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patients.map((patient) => (
                    <Card 
                      key={patient.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{patient.nome}</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {patient.data_nascimento && (
                                <p>Nascimento: {new Date(patient.data_nascimento).toLocaleDateString('pt-BR')}</p>
                              )}
                              {patient.diagnostico && (
                                <p>Diagnóstico: {patient.diagnostico}</p>
                              )}
                              <Badge variant={patient.status === 'ativo' ? 'default' : 'secondary'}>
                                {patient.status}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm">
                            Selecionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => setCurrentView('dashboard')}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
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

    const handlePatientSelect = (patient) => {
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

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center">
                <Calendar className="h-6 w-6 mr-2" />
                Selecionar Paciente para Registro Diário
              </CardTitle>
              <p className="text-muted-foreground">
                Escolha o paciente para fazer o acompanhamento diário
              </p>
            </CardHeader>
            <CardContent>
              {patients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Nenhum paciente encontrado</p>
                  <p className="text-muted-foreground mb-4">
                    Você precisa ter pacientes cadastrados para fazer registros
                  </p>
                  <Button onClick={() => setCurrentView('pacientes')}>
                    Gerenciar Pacientes
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patients.map((patient) => (
                    <Card 
                      key={patient.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{patient.nome}</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {patient.data_nascimento && (
                                <p>Nascimento: {new Date(patient.data_nascimento).toLocaleDateString('pt-BR')}</p>
                              )}
                              {patient.diagnostico && (
                                <p>Diagnóstico: {patient.diagnostico}</p>
                              )}
                              <Badge variant={patient.status === 'ativo' ? 'default' : 'secondary'}>
                                {patient.status}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm">
                            Selecionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => setCurrentView('dashboard')}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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

    const handlePatientSelect = (patient) => {
      setSelectedPatient(patient);
      setCurrentView('historico');
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

    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 mr-2" />
                Selecionar Paciente para Ver Histórico
              </CardTitle>
              <p className="text-muted-foreground">
                Escolha o paciente para visualizar o histórico de avaliações
              </p>
            </CardHeader>
            <CardContent>
              {patients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Nenhum paciente encontrado</p>
                  <p className="text-muted-foreground mb-4">
                    Você precisa ter pacientes cadastrados para ver históricos
                  </p>
                  <Button onClick={() => setCurrentView('pacientes')}>
                    Gerenciar Pacientes
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patients.map((patient) => (
                    <Card 
                      key={patient.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{patient.nome}</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {patient.data_nascimento && (
                                <p>Nascimento: {new Date(patient.data_nascimento).toLocaleDateString('pt-BR')}</p>
                              )}
                              {patient.diagnostico && (
                                <p>Diagnóstico: {patient.diagnostico}</p>
                              )}
                              <Badge variant={patient.status === 'ativo' ? 'default' : 'secondary'}>
                                {patient.status}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm">
                            Ver Histórico
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => setCurrentView('dashboard')}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return <CaregiverDashboard />;
};

export default DisfagiaApp;