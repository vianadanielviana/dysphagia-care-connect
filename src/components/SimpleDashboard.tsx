import React from 'react';
import { User, LogOut, Settings, AlertTriangle, CheckCircle, MessageCircle, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const SimpleDashboard = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  console.log('SimpleDashboard renderizando - profile:', profile);

  const handleClick = (action: string) => {
    console.log('Clique detectado:', action);
    
    switch (action) {
      case 'pacientes':
        navigate('/pacientes');
        break;
      case 'admin':
        navigate('/admin/usuarios');
        break;
      case 'logout':
        signOut();
        break;
      default:
        console.log('Ação não reconhecida:', action);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">DisfagiaMonitor Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {profile?.tipo_usuario === 'fonoaudiologo' ? 'Dra. Fernanda Silva - CRFa 12345-SP' : profile?.nome}
              </span>
              {isAdmin && (
                <Button 
                  onClick={() => handleClick('admin')}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-muted"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button 
                onClick={() => handleClick('logout')}
                variant="ghost"
                size="sm"
                className="hover:bg-muted"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard Profissional</h2>
          <p className="text-muted-foreground">Gerencie seus pacientes e acompanhe a evolução</p>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total de Pacientes</p>
                  <p className="text-2xl font-bold text-foreground">24</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Alto Risco</p>
                  <p className="text-2xl font-bold text-foreground">3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Mensagens Pendentes</p>
                  <p className="text-2xl font-bold text-foreground">7</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Consultas Hoje</p>
                  <p className="text-2xl font-bold text-foreground">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pacientes Monitorados */}
        <Card>
          <CardHeader>
            <CardTitle>Pacientes Monitorados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">PACIENTE</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">CUIDADOR</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">ÚLTIMA ATUALIZAÇÃO</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">NÍVEL DE RISCO</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium">Maria Silva</p>
                        <p className="text-sm text-muted-foreground">78 anos</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">Ana Silva (filha)</td>
                    <td className="py-4 px-4">15/08/2025</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">baixo</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                          Ver Detalhes
                        </Button>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800">
                          Mensagem
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium">João Santos</p>
                        <p className="text-sm text-muted-foreground">65 anos</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">Carlos Santos (filho)</td>
                    <td className="py-4 px-4">15/08/2025</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">alto</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                          Ver Detalhes
                        </Button>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800">
                          Mensagem
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium">Rosa Lima</p>
                        <p className="text-sm text-muted-foreground">82 anos</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">Home Care Plus</td>
                    <td className="py-4 px-4">14/08/2025</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">médio</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                          Ver Detalhes
                        </Button>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800">
                          Mensagem
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => handleClick('pacientes')}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-muted"
                >
                  <User className="h-8 w-8 text-primary" />
                  <span>Gerenciar Pacientes</span>
                </Button>
                <Button 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-muted"
                >
                  <FileText className="h-8 w-8 text-primary" />
                  <span>Nova Triagem</span>
                </Button>
                <Button 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-muted"
                >
                  <MessageCircle className="h-8 w-8 text-primary" />
                  <span>Comunicação</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SimpleDashboard;