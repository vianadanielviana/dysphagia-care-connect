import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  email: string;
  nome: string;
  tipo_usuario: string;
  created_at: string;
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nome, tipo_usuario, created_at')
        .eq('is_approved', false);

      if (error) {
        toast.error('Erro ao buscar usuários pendentes.');
        console.error('Error fetching users:', error);
      } else {
        setUsuarios(data || []);
      }
    } catch (error) {
      toast.error('Erro ao buscar usuários pendentes.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const aprovarUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) {
        toast.error('Erro ao aprovar usuário.');
        console.error('Error approving user:', error);
      } else {
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        toast.success('Usuário aprovado com sucesso!');
        console.log('[AdminApproval]', id);
      }
    } catch (error) {
      toast.error('Erro ao aprovar usuário.');
      console.error('Error:', error);
    }
  };

  const negarUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Erro ao negar usuário.');
        console.error('Error denying user:', error);
      } else {
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        toast.success('Usuário negado com sucesso!');
        console.log('[AdminDenial]', id);
      }
    } catch (error) {
      toast.error('Erro ao negar usuário.');
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Carregando usuários...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Gerenciar Usuários</h1>
            </div>
            <Button 
              onClick={signOut}
              variant="ghost"
              size="sm"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Usuários Pendentes de Aprovação</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usuarios.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum usuário pendente para aprovação.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {usuarios.map((user) => (
                  <Card key={user.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-foreground">{user.nome}</h3>
                            <Badge variant={user.tipo_usuario === 'fonoaudiologo' ? 'default' : 'secondary'}>
                              {user.tipo_usuario === 'fonoaudiologo' ? 'Fonoaudiólogo' : 'Cuidador'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => aprovarUsuario(user.id)}
                            className="bg-medical-green hover:bg-medical-green/90 text-white"
                          >
                            Aprovar
                          </Button>
                          <Button
                            onClick={() => negarUsuario(user.id)}
                            variant="destructive"
                          >
                            Negar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}