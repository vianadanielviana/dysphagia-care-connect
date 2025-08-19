-- Criar tabela de pacientes
CREATE TABLE public.pacientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  data_nascimento DATE,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  responsavel_nome TEXT,
  responsavel_telefone TEXT,
  responsavel_email TEXT,
  historico_medico TEXT,
  diagnostico TEXT,
  medicamentos_atuais TEXT,
  observacoes TEXT,
  tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('cuidador', 'fonoaudiologo')),
  usuario_cadastro_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'em_tratamento')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ativar RLS na tabela
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura por usuários autenticados
CREATE POLICY "Pacientes são visíveis para usuários autenticados" 
ON public.pacientes 
FOR SELECT 
TO authenticated
USING (true);

-- Política para permitir inserção por usuários autenticados
CREATE POLICY "Usuários autenticados podem criar pacientes" 
ON public.pacientes 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = usuario_cadastro_id);

-- Política para permitir atualização por quem cadastrou
CREATE POLICY "Usuários podem atualizar pacientes que cadastraram" 
ON public.pacientes 
FOR UPDATE 
TO authenticated
USING (auth.uid() = usuario_cadastro_id);

-- Política para permitir exclusão por quem cadastrou
CREATE POLICY "Usuários podem excluir pacientes que cadastraram" 
ON public.pacientes 
FOR DELETE 
TO authenticated
USING (auth.uid() = usuario_cadastro_id);

-- Criar função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION public.update_pacientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualização automática do timestamp
CREATE TRIGGER update_pacientes_updated_at
    BEFORE UPDATE ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pacientes_updated_at();

-- Criar índices para melhorar performance
CREATE INDEX idx_pacientes_nome ON public.pacientes(nome);
CREATE INDEX idx_pacientes_cpf ON public.pacientes(cpf);
CREATE INDEX idx_pacientes_status ON public.pacientes(status);
CREATE INDEX idx_pacientes_tipo_usuario ON public.pacientes(tipo_usuario);
CREATE INDEX idx_pacientes_usuario_cadastro ON public.pacientes(usuario_cadastro_id);