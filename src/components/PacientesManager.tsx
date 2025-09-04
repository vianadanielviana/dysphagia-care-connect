import React, { useState, useEffect } from 'react';
import { User, Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pacienteSchema, PacienteFormData } from '@/lib/schemas';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import InputMask from 'react-input-mask';

interface Paciente {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  endereco?: string;
  diagnostico?: string;
  historico_medico?: string;
  medicamentos_atuais?: string;
  observacoes?: string;
  responsavel_nome?: string;
  responsavel_email?: string;
  responsavel_telefone?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const PacientesManager = () => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const { toast } = useToast();

  const form = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: '',
      cpf: '',
      email: '',
      telefone: '',
      data_nascimento: '',
      endereco: '',
      tipo_usuario: 'paciente',
      diagnostico: '',
      historico_medico: '',
      medicamentos_atuais: '',
      observacoes: '',
      responsavel_nome: '',
      responsavel_email: '',
      responsavel_telefone: ''
    },
  });

  useEffect(() => {
    fetchPacientes();
  }, []);

  const fetchPacientes = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pacientes', {
        method: 'GET'
      });

      if (error) throw error;

      setPacientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de pacientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PacienteFormData) => {
    try {
      console.log('Form data received:', data);

      // Convert and clean data for submission
      const cleanedData = {
        ...data,
        cpf: data.cpf?.trim() || null,
        email: data.email?.trim() || null,
        telefone: data.telefone?.trim() || null,
        data_nascimento: data.data_nascimento?.trim() || null,
        endereco: data.endereco?.trim() || null,
        diagnostico: data.diagnostico?.trim() || null,
        historico_medico: data.historico_medico?.trim() || null,
        medicamentos_atuais: data.medicamentos_atuais?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
        responsavel_nome: data.responsavel_nome?.trim() || null,
        responsavel_email: data.responsavel_email?.trim() || null,
        responsavel_telefone: data.responsavel_telefone?.trim() || null,
      };

      // Remove empty strings completely
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key as keyof typeof cleanedData] === '') {
          cleanedData[key as keyof typeof cleanedData] = null;
        }
      });

      console.log('Sending cleaned data:', cleanedData);

      let response;
      if (editingPaciente) {
        // Update existing patient directly with Supabase client (RLS will handle permissions)
        const { data: updatedPaciente, error: updateError } = await supabase
          .from('pacientes')
          .update(cleanedData)
          .eq('id', editingPaciente.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        response = { data: updatedPaciente, error: null };
      } else {
        // Create new patient
        response = await supabase.functions.invoke('pacientes', {
          method: 'POST',
          body: cleanedData
        });
      }

      console.log('API Response:', response);

      if (response.error) {
        console.error('API Error:', response.error);
        throw new Error(response.error.message || 'Erro na API');
      }

      if (editingPaciente) {
        setPacientes(prev => prev.map(p => p.id === editingPaciente.id ? response.data : p));
        toast({
          title: "Sucesso",
          description: "Paciente atualizado com sucesso",
        });
      } else {
        setPacientes(prev => [response.data, ...prev]);
        toast({
          title: "Sucesso",
          description: "Paciente cadastrado com sucesso",
        });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error('Complete error object:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar paciente. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (paciente: Paciente) => {
    setEditingPaciente(paciente);
    form.reset({
      nome: paciente.nome,
      cpf: paciente.cpf || '',
      email: paciente.email || '',
      telefone: paciente.telefone || '',
      data_nascimento: paciente.data_nascimento || '',
      endereco: paciente.endereco || '',
      tipo_usuario: 'paciente',
      diagnostico: paciente.diagnostico || '',
      historico_medico: paciente.historico_medico || '',
      medicamentos_atuais: paciente.medicamentos_atuais || '',
      observacoes: paciente.observacoes || '',
      responsavel_nome: paciente.responsavel_nome || '',
      responsavel_email: paciente.responsavel_email || '',
      responsavel_telefone: paciente.responsavel_telefone || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este paciente?')) return;

    try {
      const { error } = await supabase.functions.invoke('pacientes', {
        method: 'DELETE',
        body: { id }
      });

      if (error) throw error;

      setPacientes(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Sucesso",
        description: "Paciente excluído com sucesso",
      });
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir paciente",
        variant: "destructive",
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPaciente(null);
    form.reset();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return `${age - 1} anos`;
    }
    return `${age} anos`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie os pacientes cadastrados</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPaciente(null)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPaciente ? 'Editar Paciente' : 'Novo Paciente'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                * Apenas o nome é obrigatório. Preencha os demais campos conforme necessário.
              </p>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo do paciente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="999.999.999-99"
                              value={field.value}
                              onChange={field.onChange}
                            >
                              {(inputProps: any) => <Input placeholder="000.000.000-00" {...inputProps} />}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  <FormField
                    control={form.control}
                    name="data_nascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <InputMask
                            mask="(99) 99999-9999"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => <Input placeholder="(00) 00000-0000" {...inputProps} />}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Endereço completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Informações Médicas</h3>
                  
                  <FormField
                    control={form.control}
                    name="diagnostico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diagnóstico</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Diagnóstico médico" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="historico_medico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Histórico Médico</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Histórico médico relevante" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="medicamentos_atuais"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medicamentos Atuais</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Medicamentos em uso" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações gerais" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Responsável</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsavel_nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Responsável</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="responsavel_telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone do Responsável</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="(99) 99999-9999"
                              value={field.value}
                              onChange={field.onChange}
                            >
                              {(inputProps: any) => <Input placeholder="(00) 00000-0000" {...inputProps} />}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="responsavel_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email do Responsável</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingPaciente ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {pacientes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum paciente cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece cadastrando seu primeiro paciente.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Paciente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pacientes.map((paciente) => (
            <Card key={paciente.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold">{paciente.nome}</h3>
                      <Badge variant={paciente.status === 'ativo' ? 'default' : 'secondary'}>
                        {paciente.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      {paciente.data_nascimento && (
                        <div>
                          <span className="font-medium">Idade:</span> {formatAge(paciente.data_nascimento)}
                        </div>
                      )}
                      {paciente.telefone && (
                        <div>
                          <span className="font-medium">Telefone:</span> {paciente.telefone}
                        </div>
                      )}
                      {paciente.email && (
                        <div>
                          <span className="font-medium">Email:</span> {paciente.email}
                        </div>
                      )}
                      {paciente.responsavel_nome && (
                        <div>
                          <span className="font-medium">Responsável:</span> {paciente.responsavel_nome}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Cadastrado em:</span> {formatDate(paciente.created_at)}
                      </div>
                    </div>
                    
                    {paciente.diagnostico && (
                      <div className="mt-3">
                        <span className="text-sm font-medium">Diagnóstico:</span>
                        <p className="text-sm text-muted-foreground mt-1">{paciente.diagnostico}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(paciente)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(paciente.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PacientesManager;