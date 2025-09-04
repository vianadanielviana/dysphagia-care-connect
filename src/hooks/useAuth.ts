import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  nome: string;
  tipo_usuario: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to prevent deadlocks
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          await fetchUserProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const cleanupAuthState = () => {
    // Clear all auth-related keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      console.log('Tentando fazer login com:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is approved (admin sempre passa)
      if (data.user) {
        console.log('Verificando aprovação do usuário:', data.user.id);
        
        // Admin sempre pode entrar
        if (email === 'viana.vianadaniel@outlook.com') {
          console.log('Admin detectado, login aprovado automaticamente');
          toast.success('Login realizado com sucesso!');
          return { user: data.user, session: data.session };
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_approved, tipo_usuario, nome')
          .eq('id', data.user.id)
          .single();

        console.log('Dados do perfil:', profileData);
        console.log('Erro do perfil:', profileError);

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError);
          await supabase.auth.signOut();
          throw new Error('Erro ao verificar status da conta. Contate o administrador.');
        }

        if (!profileData) {
          console.error('Perfil não encontrado');
          await supabase.auth.signOut();
          throw new Error('Perfil de usuário não encontrado. Contate o administrador.');
        }

        // Verifica se foi aprovado
        if (profileData.is_approved === true) {
          console.log('Usuário aprovado, login liberado para:', profileData.nome);
          toast.success('Login realizado com sucesso!');
          return { user: data.user, session: data.session };
        } else {
          console.log('Usuário NÃO aprovado, bloqueando login');
          await supabase.auth.signOut();
          throw new Error(`Sua conta ainda não foi aprovada. Usuário: ${profileData.nome} (${profileData.tipo_usuario}). Aguarde a aprovação de um administrador.`);
        }
      }
    } catch (error: any) {
      console.error('Erro no signIn:', error);
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, nome: string, tipo_usuario: string) => {
    try {
      cleanupAuthState();

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome,
            tipo_usuario
          }
        }
      });

      if (error) throw error;

      toast.success('Cadastro realizado! Verifique seu email e aguarde aprovação.');
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      toast.success('Logout realizado com sucesso!');
      
      // Force page reload for clean state
      window.location.href = '/';
    } catch (error: any) {
      toast.error('Erro ao fazer logout');
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isApproved: profile?.is_approved ?? false,
    isAdmin: user?.email === 'viana.vianadaniel@outlook.com'
  };
}