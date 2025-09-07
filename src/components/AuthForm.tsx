import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signInSchema, signUpSchema, type SignInFormData, type SignUpFormData } from '@/lib/schemas';
import { useNavigate } from 'react-router-dom';

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, isAdmin } = useAuth();
  const navigate = useNavigate();

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      nome: '',
      tipo_usuario: 'cuidador'
    }
  });

  const handleSignIn = async (data: SignInFormData) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      
      // Redirect admin to user management
      if (data.email === 'viana.vianadaniel@outlook.com') {
        navigate('/admin/usuarios');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      await signUp(data.email, data.password, data.nome, data.tipo_usuario);
      setIsSignUp(false);
      signUpForm.reset();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    signInForm.setValue('email', 'teste@admin.com');
    signInForm.setValue('password', 'teste123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground mb-2">
            DisfagiaMonitor
          </CardTitle>
          <p className="text-muted-foreground">
            {isSignUp ? 'Criar nova conta' : 'Cuidado especializado ao seu alcance'}
          </p>
        </CardHeader>
        
        <CardContent className="p-8">
          {!isSignUp ? (
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...signInForm.register('email')}
                  className={signInForm.formState.errors.email ? 'border-destructive' : ''}
                />
                {signInForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {signInForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  {...signInForm.register('password')}
                  className={signInForm.formState.errors.password ? 'border-destructive' : ''}
                />
                {signInForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {signInForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12" 
                size="lg"
                disabled={loading}
              >
                <LogIn className="h-5 w-5 mr-2" />
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <Button
                type="button"
                onClick={fillAdminCredentials}
                className="w-full h-12 bg-medical-amber hover:bg-medical-amber/90"
                size="lg"
              >
                <User className="h-5 w-5 mr-2" />
                Preencher Dados de Teste
              </Button>

              <Button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    // Criar conta de teste primeiro
                    await signUp('teste@admin.com', 'teste123', 'Admin Teste', 'fonoaudiologo');
                    // Depois preencher os dados
                    fillAdminCredentials();
                  } catch (error) {
                    console.log('Conta pode já existir, tentando preencher dados...');
                    fillAdminCredentials();
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                disabled={loading}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                {loading ? 'Criando...' : 'Criar Conta Teste'}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsSignUp(true)}
                  className="text-primary"
                >
                  Não tem conta? Cadastre-se
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    const email = signInForm.getValues('email');
                    if (email) {
                      // Trigger password reset
                      window.alert('Funcionalidade de recuperação será implementada');
                    } else {
                      window.alert('Digite seu email primeiro');
                    }
                  }}
                  className="text-muted-foreground text-sm block w-full"
                >
                  Esqueceu a senha?
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-nome">Nome completo</Label>
                <Input
                  id="signup-nome"
                  {...signUpForm.register('nome')}
                  className={signUpForm.formState.errors.nome ? 'border-destructive' : ''}
                />
                {signUpForm.formState.errors.nome && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.nome.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  {...signUpForm.register('email')}
                  className={signUpForm.formState.errors.email ? 'border-destructive' : ''}
                />
                {signUpForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo de usuário</Label>
                <RadioGroup
                  value={signUpForm.watch('tipo_usuario')}
                  onValueChange={(value) => signUpForm.setValue('tipo_usuario', value as 'cuidador' | 'fonoaudiologo')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cuidador" id="cuidador" />
                    <Label htmlFor="cuidador">Cuidador</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fonoaudiologo" id="fonoaudiologo" />
                    <Label htmlFor="fonoaudiologo">Fonoaudiólogo</Label>
                  </div>
                </RadioGroup>
                {signUpForm.formState.errors.tipo_usuario && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.tipo_usuario.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Senha</Label>
                <Input
                  id="signup-password"
                  type="password"
                  {...signUpForm.register('password')}
                  className={signUpForm.formState.errors.password ? 'border-destructive' : ''}
                />
                {signUpForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirmar senha</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  {...signUpForm.register('confirmPassword')}
                  className={signUpForm.formState.errors.confirmPassword ? 'border-destructive' : ''}
                />
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12" 
                size="lg"
                disabled={loading}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary"
                >
                  Já tem conta? Faça login
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}