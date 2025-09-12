import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, signUpSchema, forgotPasswordSchema, SignInFormData, SignUpFormData, ForgotPasswordFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, User, Stethoscope, Heart } from 'lucide-react';

const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, requestPasswordReset, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      nome: '',
      email: '',
      password: '',
      confirmPassword: '',
      tipo_usuario: 'cuidador',
    },
    mode: 'onSubmit',
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const handleSignIn = async (data: SignInFormData) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Erro no Login",
        description: error.message || "Erro ao fazer login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    console.log('Handle SignUp called with data:', data);
    setLoading(true);
    try {
      await signUp(data.email, data.password, data.nome, data.tipo_usuario);
      toast({
        title: "Cadastro Realizado",
        description: "Conta criada com sucesso! Aguarde aprovação de um administrador.",
      });
      setIsSignUp(false);
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Erro no Cadastro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      const { error } = await requestPasswordReset(data.email);
      
      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Email enviado!",
        description: "Verifique seu email para redefinir sua senha.",
      });
      
      setIsForgotPasswordOpen(false);
      forgotPasswordForm.reset();
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao enviar o email. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestAdmin = async () => {
    setLoading(true);
    try {
      await signIn('viana.vianadaniel@outlook.com', 'Dviana77');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Test admin error:', error);
      toast({
        title: "Erro",
        description: "Faça o cadastro primeiro com este email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    signInForm.setValue('email', 'viana.vianadaniel@outlook.com');
    signInForm.setValue('password', 'Dviana77');
  };

  const fillAdminSignupData = () => {
    signUpForm.setValue('nome', 'Daniel Viana');
    signUpForm.setValue('email', 'viana.vianadaniel@outlook.com');
    signUpForm.setValue('password', 'Dviana77');
    signUpForm.setValue('confirmPassword', 'Dviana77');
    signUpForm.setValue('tipo_usuario', 'fonoaudiologo');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center mb-4">
            <img src="/lovable-uploads/4fc3d8d5-aa4a-4c2c-9b26-e7162b91a5b6.png" alt="Gama Logo" className="h-16 w-16 mb-3" />
            <CardTitle className="text-2xl font-bold">
              {isSignUp ? 'Criar Conta' : 'Gama - Soluções em Saúde'}
            </CardTitle>
          </div>
          <CardDescription>
            {isSignUp 
              ? 'Preencha os dados para criar sua conta'
              : 'Faça login para acessar a plataforma'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isSignUp ? (
            <>
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      value={signInForm.watch('email') || ''}
                      onChange={(e) => {
                        console.log('Login Email onChange:', e.target.value);
                        signInForm.setValue('email', e.target.value, { 
                          shouldValidate: false,
                          shouldDirty: true 
                        });
                      }}
                    />
                    {signInForm.formState.errors.email && (
                      <p className="text-sm font-medium text-destructive">
                        {signInForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Senha</label>
                    <input
                      type="password"
                      placeholder="Sua senha"
                      autoComplete="current-password"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      value={signInForm.watch('password') || ''}
                      onChange={(e) => {
                        console.log('Login Password onChange:', e.target.value);
                        signInForm.setValue('password', e.target.value, { 
                          shouldValidate: false,
                          shouldDirty: true 
                        });
                      }}
                    />
                    {signInForm.formState.errors.password && (
                      <p className="text-sm font-medium text-destructive">
                        {signInForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center">
                <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="text-sm text-muted-foreground">
                      Esqueci minha senha
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Redefinir Senha</DialogTitle>
                    </DialogHeader>
                    <Form {...forgotPasswordForm}>
                      <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                        <FormField
                          control={forgotPasswordForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Digite seu email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Enviar Email de Reset
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          ) : (
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <FormField
                  control={signUpForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <Input
                        placeholder="Digite seu nome completo"
                        autoComplete="name"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    placeholder="Digite seu email"
                    autoComplete="email"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    value={signUpForm.watch('email') || ''}
                    onChange={(e) => {
                      console.log('Email onChange manual:', e.target.value);
                      signUpForm.setValue('email', e.target.value, { 
                        shouldValidate: false,
                        shouldDirty: true 
                      });
                    }}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm font-medium text-destructive">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <FormField
                  control={signUpForm.control}
                  name="tipo_usuario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Usuário</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-1 gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cuidador" id="cuidador" />
                            <Label htmlFor="cuidador" className="flex items-center space-x-2 cursor-pointer">
                              <Heart className="h-4 w-4 text-medical-red" />
                              <span>Cuidador/Familiar</span>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fonoaudiologo" id="fonoaudiologo" />
                            <Label htmlFor="fonoaudiologo" className="flex items-center space-x-2 cursor-pointer">
                              <Stethoscope className="h-4 w-4 text-primary" />
                              <span>Fonoaudiólogo</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Digite a senha novamente"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Conta
                </Button>
              </form>
            </Form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="ghost"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={loading}
            className="w-full"
          >
            {isSignUp 
              ? 'Já tem conta? Faça login'
              : 'Não tem conta? Cadastre-se'
            }
          </Button>

          {isSignUp && (
            <Button
              variant="outline"
              onClick={fillAdminSignupData}
              disabled={loading}
              size="sm"
              className="w-full"
            >
              Preencher Dados Admin
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthForm;