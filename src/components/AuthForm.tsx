import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, signUpSchema, SignInFormData, SignUpFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, User, Stethoscope, Heart } from 'lucide-react';

const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, isAdmin } = useAuth();
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
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Criar Conta' : 'DisfagiaMonitor'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Preencha os dados para criar sua conta'
              : 'Faça login para acessar a plataforma'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isSignUp ? (
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Sua senha"
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
                  Entrar
                </Button>
              </form>
            </Form>
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