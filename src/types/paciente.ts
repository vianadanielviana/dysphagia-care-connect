export interface Paciente {
  id: string;
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  responsavel_nome?: string;
  responsavel_telefone?: string;
  responsavel_email?: string;
  historico_medico?: string;
  diagnostico?: string;
  medicamentos_atuais?: string;
  observacoes?: string;
  tipo_usuario: 'cuidador' | 'fonoaudiologo';
  usuario_cadastro_id?: string;
  status: 'ativo' | 'inativo' | 'em_tratamento';
  created_at: string;
  updated_at: string;
}

export interface NovoPaciente {
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  responsavel_nome?: string;
  responsavel_telefone?: string;
  responsavel_email?: string;
  historico_medico?: string;
  diagnostico?: string;
  medicamentos_atuais?: string;
  observacoes?: string;
  tipo_usuario: 'cuidador' | 'fonoaudiologo';
}