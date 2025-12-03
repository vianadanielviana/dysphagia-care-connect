import React, { useState, useEffect } from 'react';
import { User, Plus, Edit, Trash2, UserPlus, Users } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import PatientDocuments from './PatientDocuments';
import DelegacaoModal from './DelegacaoModal';

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
  professional_id?: string;
  caregiver_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UsuarioSistema {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
}

const PacientesManager = () => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [delegacaoModalOpen, setDelegacaoModalOpen] = useState(false);
  const [selectedPacienteForDelegacao, setSelectedPacienteForDelegacao] = useState<Paciente | null>(null);
  const { toast } = useToast();
  const { profile, isAdmin } = useAuth();

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
      responsavel_telefone: '',
      professional_id: 'none',
      caregiver_id: 'none'
    },
  });

  useEffect(() => {
    console.log('Profile on mount:', profile);
    console.log('IsAdmin on mount:', isAdmin);
    fetchPacientes();
    fetchUsuarios();
  }, []);

  const fetchPacientes = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('created_at', { ascending: false });

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

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_available_users_for_assignment');

      if (error) throw error;

      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de usuários",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: PacienteFormData) => {
    try {
      console.log('Form data received:', data);
      console.log('User profile:', profile);
      console.log('Is admin:', isAdmin);

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
        professional_id: data.professional_id === 'none' ? null : (data.professional_id?.trim() || null),
        caregiver_id: data.caregiver_id === 'none' ? null : (data.caregiver_id?.trim() || null),
      };

      // Remove empty strings completely
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key as keyof typeof cleanedData] === '') {
          cleanedData[key as keyof typeof cleanedData] = null;
        }
      });

      console.log('Sending cleaned data:', cleanedData);

      // Auto-assign professional_id if current user is fonoaudiólogo and none selected
      if (profile?.tipo_usuario === 'fonoaudiologo' && !cleanedData.professional_id) {
        cleanedData.professional_id = profile.id;
      }

      let response;
      if (editingPaciente) {
        // Update existing patient
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
        // Create new patient (avoid return=representation to bypass SELECT RLS on insert)
        const { error: insertError } = await supabase
          .from('pacientes')
          .insert(cleanedData);

        if (insertError) {
          throw insertError;
        }

        // Refetch to include the new record respecting SELECT policies
        await fetchPacientes();
        response = { data: null, error: null };
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
        // Lista já foi atualizada via fetchPacientes()
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
        description: (() => {
          const msg = (error?.message || '').toLowerCase();
          // Debug info in console
          console.log('Profile info:', { 
            profile, 
            isAdmin, 
            userEmail: profile?.email,
            userType: profile?.tipo_usuario,
            isApproved: profile?.is_approved 
          });
          
          if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('policy')) {
            return `Erro de permissão - Usuário: ${profile?.email}, Tipo: ${profile?.tipo_usuario}, Aprovado: ${profile?.is_approved}`;
          }
          return error.message || 'Erro ao salvar paciente. Verifique os dados e tente novamente.';
        })(),
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
      responsavel_telefone: paciente.responsavel_telefone || '',
      professional_id: paciente.professional_id || 'none',
      caregiver_id: paciente.caregiver_id || 'none'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(isAdmin || profile?.tipo_usuario === 'admin')) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores do sistema podem excluir pacientes",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPacientes(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Sucesso",
        description: "Paciente excluído com sucesso",
      });
    } catch (error: any) {
      console.error('Erro ao excluir paciente:', error);
      const message = (error?.message || '').toLowerCase();
      const code = error?.code;
      toast({
        title: "Erro ao excluir",
        description:
          code === '23503' || message.includes('foreign key') || message.includes('still referenced')
            ? 'Existem registros relacionados (ex.: avaliações de triagem) vinculados a este paciente. Exclua-os antes ou solicite exclusão em cascata.'
            : (message.includes('row-level security') || message.includes('policy') || message.includes('permission denied'))
              ? 'Apenas administradores do sistema podem excluir pacientes'
              : 'Ocorreu um erro ao excluir o paciente. Tente novamente.',
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
          <p className="text-muted-foreground">
            {profile?.tipo_usuario === 'admin' 
              ? 'Gerencie todos os pacientes do sistema' 
              : profile?.tipo_usuario === 'fonoaudiologo'
              ? 'Gerencie seus pacientes atribuídos'
              : 'Visualize seus pacientes atribuídos'
            }
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            {(profile?.tipo_usuario === 'fonoaudiologo' || profile?.tipo_usuario === 'admin') && (
              <Button onClick={() => setEditingPaciente(null)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Paciente
              </Button>
            )}
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

                {isAdmin && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Usuários Responsáveis no Sistema</h3>
                    <p className="text-sm text-muted-foreground">
                      Apenas administradores podem definir os responsáveis no sistema.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="professional_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profissional Responsável</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um profissional" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {usuarios
                                  .filter(u => u.tipo_usuario === 'fonoaudiologo' || u.tipo_usuario === 'admin' || u.tipo_usuario === 'nutricionista')
                                  .map(usuario => (
                                  <SelectItem key={usuario.id} value={usuario.id}>
                                    {usuario.nome} ({usuario.tipo_usuario})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="caregiver_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cuidador Responsável</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um cuidador" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {usuarios
                                  .filter(u => u.tipo_usuario === 'cuidador')
                                  .map(usuario => (
                                  <SelectItem key={usuario.id} value={usuario.id}>
                                    {usuario.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

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
              <h3 className="text-lg font-semibold mb-2">Nenhum paciente encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {profile?.tipo_usuario === 'admin' 
                  ? 'Nenhum paciente cadastrado no sistema.'
                  : profile?.tipo_usuario === 'fonoaudiologo'
                  ? 'Você não tem pacientes atribuídos ou não há pacientes cadastrados.'
                  : 'Você não tem pacientes atribuídos.'
                }
              </p>
              {(profile?.tipo_usuario === 'fonoaudiologo' || profile?.tipo_usuario === 'admin') && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Paciente
                </Button>
              )}
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
                      {paciente.professional_id && (
                        <div>
                          <span className="font-medium">Profissional:</span> {usuarios.find(u => u.id === paciente.professional_id)?.nome || 'Não identificado'}
                        </div>
                      )}
                      {paciente.caregiver_id && (
                        <div>
                          <span className="font-medium">Cuidador:</span> {usuarios.find(u => u.id === paciente.caregiver_id)?.nome || 'Não identificado'}
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

                    {/* Seção de Documentos */}
                    <div className="mt-4 pt-4 border-t">
                      <PatientDocuments 
                        patientId={paciente.id}
                        patientName={paciente.nome}
                        canUpload={profile?.tipo_usuario === 'fonoaudiologo' || profile?.tipo_usuario === 'admin'}
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPacienteForDelegacao(paciente);
                          setDelegacaoModalOpen(true);
                        }}
                        title="Delegar responsáveis"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(paciente)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(paciente.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Delegação - Apenas Admins */}
      <DelegacaoModal
        open={delegacaoModalOpen}
        onOpenChange={setDelegacaoModalOpen}
        paciente={selectedPacienteForDelegacao}
        usuarios={usuarios}
        onSuccess={() => {
          fetchPacientes();
          setSelectedPacienteForDelegacao(null);
        }}
      />
    </div>
  );
};

export default PacientesManager;