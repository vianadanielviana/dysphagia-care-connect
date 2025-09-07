-- Modificar políticas RLS da tabela pacientes para permitir que todos os usuários vejam todos os pacientes
-- e adicionar funcionalidade para vincular responsáveis

-- Primeiro, remove as políticas restritivas existentes
DROP POLICY IF EXISTS "secure_pacientes_select_2025" ON pacientes;
DROP POLICY IF EXISTS "secure_pacientes_insert_2025" ON pacientes;
DROP POLICY IF EXISTS "secure_pacientes_update_2025" ON pacientes;
DROP POLICY IF EXISTS "secure_pacientes_delete_2025" ON pacientes;

-- Nova política para SELECT: todos os usuários autenticados podem ver todos os pacientes
CREATE POLICY "authenticated_users_can_view_all_patients" 
ON pacientes 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Nova política para INSERT: usuários autenticados podem criar pacientes
CREATE POLICY "authenticated_users_can_create_patients" 
ON pacientes 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Nova política para UPDATE: usuários autenticados podem atualizar pacientes
-- (pode ser refinada depois se necessário para permitir apenas certos usuários)
CREATE POLICY "authenticated_users_can_update_patients" 
ON pacientes 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Nova política para DELETE: apenas admins e profissionais podem deletar
CREATE POLICY "authorized_users_can_delete_patients" 
ON pacientes 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND (tipo_usuario IN ('admin', 'fonoaudiologo') OR is_admin = true)
  )
);

-- Criar função para buscar usuários disponíveis para seleção como responsáveis
CREATE OR REPLACE FUNCTION get_available_users_for_assignment()
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  tipo_usuario text
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.tipo_usuario
  FROM profiles p
  WHERE p.is_approved = true
  ORDER BY p.nome;
$$;