import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  nome: string;
  tipo_usuario: string;
  is_approved: boolean;
  created_at: string;
}

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const adminStatus = session.user.email === 'viana.vianadaniel@outlook.com';
          setIsAdmin(adminStatus);
          
          if (adminStatus) {
            await loadPendingUsers();
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const adminStatus = session.user.email === 'viana.vianadaniel@outlook.com';
          setIsAdmin(adminStatus);
          
          if (adminStatus) {
            await loadPendingUsers();
          }
        } else {
          setUser(null);
          setIsAdmin(false);
          setPendingUsers([]);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error loading pending users:', error);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', userId);

      if (error) throw error;

      console.log('[AdminApproval]', { userId, action: 'approved' });
      
      // Remove from pending list
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      return { success: true };
    } catch (error) {
      console.error('Error approving user:', error);
      return { success: false, error };
    }
  };

  return {
    isAdmin,
    user,
    pendingUsers,
    loading,
    approveUser,
    loadPendingUsers
  };
};