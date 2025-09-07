-- CORREÇÃO CRÍTICA DE SEGURANÇA: Implementar políticas seguras para pacientes
-- Primeiro, remove todas as políticas existentes para garantir limpeza

DROP POLICY IF EXISTS "secure_patient_access_select" ON pacientes;
DROP POLICY IF EXISTS "secure_patient_access_insert" ON pacientes;  
DROP POLICY IF EXISTS "secure_patient_access_update" ON pacientes;
DROP POLICY IF EXISTS "authorized_users_can_delete_patients" ON pacientes;

-- NOVA POLÍTICA SEGURA PARA SELECT: Controle de acesso baseado em funções
CREATE POLICY "rls_secure_patient_select_2025" 
ON pacientes 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Administradores do sistema podem ver todos os pacientes
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND (tipo_usuario = 'admin' OR is_admin = true)
    )
    OR
    -- Profissional responsável pode ver apenas SEUS pacientes
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR
    -- Cuidador responsável pode ver apenas SEUS pacientes
    (caregiver_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND tipo_usuario = 'cuidador'
    ))
  )
);

-- NOVA POLÍTICA SEGURA PARA INSERT: Apenas profissionais podem criar
CREATE POLICY "rls_secure_patient_insert_2025" 
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

-- NOVA POLÍTICA SEGURA PARA UPDATE: Apenas usuários autorizados
CREATE POLICY "rls_secure_patient_update_2025" 
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
    -- Profissional responsável pode atualizar apenas seus pacientes
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
  )
);

-- NOVA POLÍTICA SEGURA PARA DELETE: Apenas admins e profissionais
CREATE POLICY "rls_secure_patient_delete_2025" 
ON pacientes 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND (tipo_usuario IN ('admin', 'fonoaudiologo') OR is_admin = true)
  )
);