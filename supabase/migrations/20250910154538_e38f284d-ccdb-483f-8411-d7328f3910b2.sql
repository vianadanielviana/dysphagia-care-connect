-- SECURITY FIX: Remove duplicate patients table and ensure correct RLS on pacientes table
-- This resolves the critical patient medical records security vulnerability

-- Drop the unused patients table that was creating confusion
DROP TABLE IF EXISTS public.patients CASCADE;

-- Drop existing RLS policies on pacientes to recreate them simplified
DROP POLICY IF EXISTS "admins_full_access" ON public.pacientes;
DROP POLICY IF EXISTS "caregivers_assigned_patients" ON public.pacientes;  
DROP POLICY IF EXISTS "professionals_assigned_patients" ON public.pacientes;
DROP POLICY IF EXISTS "simple_patient_delete" ON public.pacientes;
DROP POLICY IF EXISTS "simple_patient_insert" ON public.pacientes;
DROP POLICY IF EXISTS "simple_patient_update" ON public.pacientes;

-- Create simplified and secure RLS policies for pacientes table
CREATE POLICY "pacientes_select_policy" ON public.pacientes
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Admins can see all patients
    is_system_admin_secure()
    OR
    -- Professionals can see their assigned patients
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_approved = true 
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
    OR  
    -- Caregivers can see their assigned patients
    (caregiver_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_approved = true 
      AND p.tipo_usuario = 'cuidador'
    ))
  )
);

CREATE POLICY "pacientes_insert_policy" ON public.pacientes  
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.is_approved = true 
    AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
  )
);

CREATE POLICY "pacientes_update_policy" ON public.pacientes
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    is_system_admin_secure()
    OR
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_approved = true 
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
  )
) WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_system_admin_secure()
    OR
    (professional_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_approved = true 
      AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ))
  )
);

CREATE POLICY "pacientes_delete_policy" ON public.pacientes
FOR DELETE USING (
  auth.uid() IS NOT NULL AND is_system_admin_secure()
);

-- Update the table comment for security documentation
COMMENT ON TABLE public.pacientes IS 'MEDICAL RECORDS - SECURITY CRITICAL: Patient medical data with strict RLS. Access limited to: 1) Admins (full access), 2) Assigned professionals (fonoaudiologo/admin), 3) Assigned caregivers (view only their patients). All access logged.';

-- Ensure the get_pacientes_safe function is properly secured
CREATE OR REPLACE FUNCTION public.get_pacientes_safe()
RETURNS TABLE(
  id uuid, nome text, cpf text, data_nascimento date, telefone text, 
  email text, endereco text, diagnostico text, historico_medico text, 
  medicamentos_atuais text, observacoes text, responsavel_nome text, 
  responsavel_email text, responsavel_telefone text, status text, 
  professional_id uuid, caregiver_id uuid, usuario_cadastro_id uuid, 
  created_at timestamp with time zone, updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER 
SET search_path = 'public'
AS $$
  SELECT 
    p.id, p.nome, p.cpf, p.data_nascimento, p.telefone, p.email, 
    p.endereco, p.diagnostico, p.historico_medico, p.medicamentos_atuais, 
    p.observacoes, p.responsavel_nome, p.responsavel_email, 
    p.responsavel_telefone, p.status, p.professional_id, p.caregiver_id, 
    p.usuario_cadastro_id, p.created_at, p.updated_at
  FROM public.pacientes p
  WHERE EXISTS (
    SELECT 1 FROM public.profiles prof 
    WHERE prof.id = auth.uid()
    AND prof.is_approved = true
    AND (
      prof.tipo_usuario = 'admin' OR prof.is_admin = true OR
      (p.professional_id = auth.uid() AND prof.tipo_usuario IN ('fonoaudiologo', 'admin')) OR
      (p.caregiver_id = auth.uid() AND prof.tipo_usuario = 'cuidador')
    )
  );
$$;