import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePacientes } from '@/hooks/usePacientes';
import { Paciente, NovoPaciente } from '@/types/paciente';
import { Plus, User, Phone, Mail, Calendar, MapPin, Pill, FileText } from 'lucide-react';

interface PacientesListProps {
  tipoUsuario: 'cuidador' | 'fonoaudiologo';
}

export const PacientesList: React.FC<PacientesListProps> = ({ tipoUsuario }) => {
  const { pacientes, loading, criarPaciente } = usePacientes();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [filtro, setFiltro] = useState('');
  const [novoPaciente, setNovoPaciente] = useState<NovoPaciente>({
    nome: '',
    tipo_usuario: tipoUsuario
  });

  const pacientesFiltrados = pacientes.filter(paciente => 
    paciente.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    (paciente.cpf && paciente.cpf.includes(filtro)) ||
    (paciente.telefone && paciente.telefone.includes(filtro))
  );

  const handleCriarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await criarPaciente(novoPaciente);
      setNovoPaciente({ nome: '', tipo_usuario: tipoUsuario });
      setDialogAberto(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-500';
      case 'em_tratamento': return 'bg-blue-500';
      case 'inativo': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatarData = (data: string) => {
    if (!data) return '';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Pacientes Cadastrados</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pacientes Cadastrados</h2>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCriarPaciente} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={novoPaciente.nome}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={novoPaciente.cpf || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, cpf: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={novoPaciente.data_nascimento || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, data_nascimento: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={novoPaciente.telefone || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, telefone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={novoPaciente.email || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={novoPaciente.endereco || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, endereco: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados do Responsável</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="responsavel_nome">Nome do Responsável</Label>
                    <Input
                      id="responsavel_nome"
                      value={novoPaciente.responsavel_nome || ''}
                      onChange={(e) => setNovoPaciente(prev => ({ ...prev, responsavel_nome: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="responsavel_telefone">Telefone do Responsável</Label>
                    <Input
                      id="responsavel_telefone"
                      value={novoPaciente.responsavel_telefone || ''}
                      onChange={(e) => setNovoPaciente(prev => ({ ...prev, responsavel_telefone: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="responsavel_email">Email do Responsável</Label>
                  <Input
                    id="responsavel_email"
                    type="email"
                    value={novoPaciente.responsavel_email || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, responsavel_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações Médicas</h3>
                <div>
                  <Label htmlFor="diagnostico">Diagnóstico</Label>
                  <Textarea
                    id="diagnostico"
                    value={novoPaciente.diagnostico || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, diagnostico: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="historico_medico">Histórico Médico</Label>
                  <Textarea
                    id="historico_medico"
                    value={novoPaciente.historico_medico || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, historico_medico: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="medicamentos_atuais">Medicamentos Atuais</Label>
                  <Textarea
                    id="medicamentos_atuais"
                    value={novoPaciente.medicamentos_atuais || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, medicamentos_atuais: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={novoPaciente.observacoes || ''}
                    onChange={(e) => setNovoPaciente(prev => ({ ...prev, observacoes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Cadastrar Paciente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="max-w-md"
        />
      </div>

      {pacientesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Nenhum paciente encontrado</h3>
            <p className="text-gray-600 mb-4">
              {filtro ? 'Nenhum paciente corresponde à sua busca.' : 'Cadastre o primeiro paciente para começar.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pacientesFiltrados.map((paciente) => (
            <Card key={paciente.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setPacienteSelecionado(paciente)}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{paciente.nome}</CardTitle>
                  <Badge className={getStatusColor(paciente.status)}>
                    {paciente.status.charAt(0).toUpperCase() + paciente.status.slice(1).replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {paciente.telefone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{paciente.telefone}</span>
                    </div>
                  )}
                  {paciente.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{paciente.email}</span>
                    </div>
                  )}
                  {paciente.data_nascimento && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{formatarData(paciente.data_nascimento)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="capitalize">{paciente.tipo_usuario}</span>
                  </div>
                </div>
                {paciente.diagnostico && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex items-start gap-1">
                      <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                      <span className="text-sm text-gray-600 line-clamp-2">{paciente.diagnostico}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Detalhes do Paciente */}
      {pacienteSelecionado && (
        <Dialog open={!!pacienteSelecionado} onOpenChange={() => setPacienteSelecionado(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold">{pacienteSelecionado.nome}</h3>
                <Badge className={getStatusColor(pacienteSelecionado.status)}>
                  {pacienteSelecionado.status.charAt(0).toUpperCase() + pacienteSelecionado.status.slice(1).replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Informações Pessoais</h4>
                  <div className="space-y-2 text-sm">
                    {pacienteSelecionado.cpf && <p><strong>CPF:</strong> {pacienteSelecionado.cpf}</p>}
                    {pacienteSelecionado.data_nascimento && <p><strong>Data de Nascimento:</strong> {formatarData(pacienteSelecionado.data_nascimento)}</p>}
                    {pacienteSelecionado.telefone && <p><strong>Telefone:</strong> {pacienteSelecionado.telefone}</p>}
                    {pacienteSelecionado.email && <p><strong>Email:</strong> {pacienteSelecionado.email}</p>}
                    {pacienteSelecionado.endereco && <p><strong>Endereço:</strong> {pacienteSelecionado.endereco}</p>}
                  </div>
                </div>

                {(pacienteSelecionado.responsavel_nome || pacienteSelecionado.responsavel_telefone || pacienteSelecionado.responsavel_email) && (
                  <div>
                    <h4 className="font-medium mb-2">Responsável</h4>
                    <div className="space-y-2 text-sm">
                      {pacienteSelecionado.responsavel_nome && <p><strong>Nome:</strong> {pacienteSelecionado.responsavel_nome}</p>}
                      {pacienteSelecionado.responsavel_telefone && <p><strong>Telefone:</strong> {pacienteSelecionado.responsavel_telefone}</p>}
                      {pacienteSelecionado.responsavel_email && <p><strong>Email:</strong> {pacienteSelecionado.responsavel_email}</p>}
                    </div>
                  </div>
                )}
              </div>

              {(pacienteSelecionado.diagnostico || pacienteSelecionado.historico_medico || pacienteSelecionado.medicamentos_atuais) && (
                <div>
                  <h4 className="font-medium mb-2">Informações Médicas</h4>
                  <div className="space-y-3">
                    {pacienteSelecionado.diagnostico && (
                      <div>
                        <strong className="text-sm">Diagnóstico:</strong>
                        <p className="text-sm text-gray-600 mt-1">{pacienteSelecionado.diagnostico}</p>
                      </div>
                    )}
                    {pacienteSelecionado.historico_medico && (
                      <div>
                        <strong className="text-sm">Histórico Médico:</strong>
                        <p className="text-sm text-gray-600 mt-1">{pacienteSelecionado.historico_medico}</p>
                      </div>
                    )}
                    {pacienteSelecionado.medicamentos_atuais && (
                      <div>
                        <strong className="text-sm">Medicamentos Atuais:</strong>
                        <p className="text-sm text-gray-600 mt-1">{pacienteSelecionado.medicamentos_atuais}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {pacienteSelecionado.observacoes && (
                <div>
                  <h4 className="font-medium mb-2">Observações</h4>
                  <p className="text-sm text-gray-600">{pacienteSelecionado.observacoes}</p>
                </div>
              )}

              <div className="text-xs text-gray-500 pt-4 border-t">
                <p>Cadastrado em: {formatarData(pacienteSelecionado.created_at)}</p>
                <p>Última atualização: {formatarData(pacienteSelecionado.updated_at)}</p>
                <p>Tipo de usuário: {pacienteSelecionado.tipo_usuario}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};