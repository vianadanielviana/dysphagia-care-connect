-- CORREÇÃO CRÍTICA DE SEGURANÇA: Restringir acesso aos dados dos pacientes
-- Remove políticas muito permissivas e implementa controle de acesso baseado em funções

-- Remove as políticas inseguras que permitem acesso total
DROP POLICY IF EXISTS "authenticated_users_can_view_all_patients" ON pacientes;
DROP POLICY IF EXISTS "authenticated_users_can_create_patients" ON pacientes;
DROP POLICY IF EXISTS "authenticated_users_can_update_patients" ON pacientes;

-- POLÍTICA SEGURA PARA SELECT: Apenas usuários autorizados podem ver pacientes
CREATE POLICY "secure_patient_access_select" 
ON pacientes 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Administradores do sistema podem ver todos
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND (tipo_usuario = 'admin' OR is_admin = true)
    )
    OR
    -- Profissional responsável pode ver seus pacientes
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR
    -- Cuidador responsável pode ver seus pacientes
    (caregiver_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND tipo_usuario = 'cuidador'
    ))
  )
);

-- POLÍTICA SEGURA PARA INSERT: Apenas profissionais aprovados podem criar pacientes
CREATE POLICY "secure_patient_access_insert" 
ON pacientes 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND tipo_usuario IN ('fonoaudiologo', 'admin')
  )
);

-- POLÍTICA SEGURA PARA UPDATE: Apenas usuários autorizados podem atualizar
CREATE POLICY "secure_patient_access_update" 
ON pacientes 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Administradores podem atualizar todos
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND (tipo_usuario = 'admin' OR is_admin = true)
    )
    OR
    -- Profissional responsável pode atualizar seus pacientes
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
  )
);

-- Política para DELETE já está segura, mantém como está

-- Criar função para verificar se um usuário pode ver a lista de pacientes
-- (mesmo sem ver dados sensíveis)
CREATE OR REPLACE FUNCTION can_view_patients_list()
RETURNS boolean
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND tipo_usuario IN ('fonoaudiologo', 'cuidador', 'admin')
  );
$$;