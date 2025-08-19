import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Paciente, NovoPaciente } from '@/types/paciente';
import { useToast } from '@/hooks/use-toast';

export const usePacientes = () => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const carregarPacientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('nome');

      if (error) {
        throw error;
      }

      // Garantir que os tipos sejam corretos
      const pacientesFormatados = (data || []).map(paciente => ({
        ...paciente,
        tipo_usuario: paciente.tipo_usuario as 'cuidador' | 'fonoaudiologo',
        status: paciente.status as 'ativo' | 'inativo' | 'em_tratamento'
      }));

      setPacientes(pacientesFormatados);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar a lista de pacientes.",
      });
    } finally {
      setLoading(false);
    }
  };

  const criarPaciente = async (novoPaciente: NovoPaciente) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('pacientes')
        .insert([{
          ...novoPaciente,
          usuario_cadastro_id: user.id
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const pacienteFormatado = {
        ...data,
        tipo_usuario: data.tipo_usuario as 'cuidador' | 'fonoaudiologo',
        status: data.status as 'ativo' | 'inativo' | 'em_tratamento'
      };
      setPacientes(prev => [...prev, pacienteFormatado]);
      toast({
        title: "Sucesso",
        description: "Paciente cadastrado com sucesso!",
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível cadastrar o paciente.",
      });
      throw error;
    }
  };

  const atualizarPaciente = async (id: string, dadosAtualizados: Partial<Paciente>) => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .update(dadosAtualizados)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const pacienteAtualizado = {
        ...data,
        tipo_usuario: data.tipo_usuario as 'cuidador' | 'fonoaudiologo',
        status: data.status as 'ativo' | 'inativo' | 'em_tratamento'
      };
      setPacientes(prev => 
        prev.map(p => p.id === id ? { ...p, ...pacienteAtualizado } : p)
      );

      toast({
        title: "Sucesso",
        description: "Paciente atualizado com sucesso!",
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o paciente.",
      });
      throw error;
    }
  };

  const excluirPaciente = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setPacientes(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Sucesso",
        description: "Paciente removido com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o paciente.",
      });
      throw error;
    }
  };

  useEffect(() => {
    carregarPacientes();
  }, []);

  return {
    pacientes,
    loading,
    carregarPacientes,
    criarPaciente,
    atualizarPaciente,
    excluirPaciente
  };
};