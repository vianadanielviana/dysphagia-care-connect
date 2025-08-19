import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, FileText, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthFormProps {
  onAuthSuccess: (userType: 'cuidador' | 'fonoaudiologo') => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'cuidador' | 'fonoaudiologo'>('cuidador');
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Verificar se o usuário está aprovado
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_approved')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          throw new Error('Erro ao verificar status da conta.');
        }

        if (!profile.is_approved) {
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Conta não aprovada",
            description: "Sua conta aguarda aprovação do administrador.",
          });
          return;
        }

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo(a) de volta!`,
        });
        onAuthSuccess(userType);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error.message || "Erro ao fazer login. Verifique suas credenciais.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome,
            tipo_usuario: userType
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Cadastro realizado!",
        description: "Sua conta aguarda aprovação do administrador. Você receberá uma notificação quando for aprovado.",
      });

      // Limpar formulário
      setEmail('');
      setPassword('');
      setNome('');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error.message || "Erro ao criar conta. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async (type: 'cuidador' | 'fonoaudiologo') => {
    setLoading(true);
    
    // Credenciais de teste
    const testCredentials = {
      cuidador: { email: 'cuidador@teste.com', password: 'teste123' },
      fonoaudiologo: { email: 'fonoaudiologo@teste.com', password: 'teste123' }
    };

    try {
      const { data, error } = await supabase.auth.signInWithPassword(testCredentials[type]);

      if (error) {
        // Se não existir, criar conta de teste
        const { error: signUpError } = await supabase.auth.signUp({
          ...testCredentials[type],
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              nome: type === 'cuidador' ? 'Usuário Teste Cuidador' : 'Usuário Teste Fonoaudiólogo',
              tipo_usuario: type
            }
          }
        });

        if (signUpError) throw signUpError;

        toast({
          title: "Conta de teste criada!",
          description: "Fazendo login automaticamente...",
        });

        // Tentar login novamente
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword(testCredentials[type]);
        if (loginError) throw loginError;
        
        if (loginData.user) {
          onAuthSuccess(type);
        }
      } else if (data.user) {
        toast({
          title: "Login de teste realizado!",
          description: `Logado como ${type}`,
        });
        onAuthSuccess(type);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no login de teste",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'viana.vianadaniel@outlook.com',
        password: '123qwe.'
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Login admin realizado!",
          description: "Bem-vindo ao painel administrativo",
        });
        onAuthSuccess('fonoaudiologo'); // Admin é tratado como fonoaudiólogo no sistema
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no login admin",
        description: "Credenciais de administrador inválidas",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">DisfagiaMonitor</CardTitle>
          <p className="text-muted-foreground">Cuidado especializado ao seu alcance</p>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Botões de Teste Rápido */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-center">Acesso Rápido para Teste</h3>
              <div className="grid gap-2">
                <Button 
                  onClick={() => handleTestLogin('cuidador')}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <User className="h-4 w-4 mr-2" />
                  Entrar como Cuidador (Teste)
                </Button>
                <Button 
                  onClick={() => handleTestLogin('fonoaudiologo')}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Entrar como Fonoaudiólogo (Teste)
                </Button>
                <Button 
                  onClick={() => handleAdminLogin()}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou faça login/cadastro
                </span>
              </div>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Cadastro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-login">Email</Label>
                    <Input
                      id="email-login"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password-login">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password-login"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Usuário</Label>
                    <Tabs value={userType} onValueChange={(value) => setUserType(value as 'cuidador' | 'fonoaudiologo')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="cuidador">Cuidador</TabsTrigger>
                        <TabsTrigger value="fonoaudiologo">Fonoaudiólogo</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome-signup">Nome Completo</Label>
                    <Input
                      id="nome-signup"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password-signup"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Usuário</Label>
                    <Tabs value={userType} onValueChange={(value) => setUserType(value as 'cuidador' | 'fonoaudiologo')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="cuidador">Cuidador</TabsTrigger>
                        <TabsTrigger value="fonoaudiologo">Fonoaudiólogo</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};