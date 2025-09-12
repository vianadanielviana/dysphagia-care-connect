import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/schemas';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updatePassword, loading } = useAuth();
  const [isValidToken, setIsValidToken] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Check for recovery session from Supabase auth state
    const checkRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL fragments for Supabase recovery parameters
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      
      // Check query params as fallback
      const queryType = searchParams.get('type');
      const queryToken = searchParams.get('token');
      
      const isRecovery = type === 'recovery' || queryType === 'recovery' || queryToken;
      
      if (!isRecovery && !session) {
        toast({
          title: "Link inválido",
          description: "O link de reset de senha é inválido ou expirou.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }
      
      setIsValidToken(true);
    };
    
    checkRecoverySession();
  }, [searchParams, navigate]);

  const handleSubmit = async (data: ResetPasswordFormData) => {
    try {
      const { error } = await updatePassword(data.password);
      
      if (error) {
        toast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Senha redefinida com sucesso!",
        description: "Você pode fazer login com sua nova senha.",
      });
      
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao redefinir sua senha. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Redefinir Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite sua nova senha"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirme sua nova senha"
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
                Redefinir Senha
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;