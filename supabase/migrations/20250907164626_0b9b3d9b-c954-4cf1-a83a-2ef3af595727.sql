-- =====================================================
-- REPLACE PACIENTES_SAFE VIEW WITH SECURITY INVOKER FUNCTION
-- =====================================================

-- Drop the existing view that uses SECURITY DEFINER functions
DROP VIEW IF EXISTS public.pacientes_safe;

-- Create a SECURITY INVOKER function instead of a SECURITY DEFINER view
-- This function will use RLS policies on the underlying table for security
CREATE OR REPLACE FUNCTION public.get_pacientes_safe()
RETURNS TABLE (
    id uuid,
    nome text,
    cpf text,
    data_nascimento date,
    telefone text,
    email text,
    endereco text,
    diagnostico text,
    historico_medico text,
    medicamentos_atuais text,
    observacoes text,
    responsavel_nome text,
    responsavel_email text,
    responsavel_telefone text,
    status text,
    professional_id uuid,
    caregiver_id uuid,
    usuario_cadastro_id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE SQL
STABLE
SECURITY INVOKER  -- Use INVOKER instead of DEFINER for better security
SET search_path = public
AS $$
  -- This function relies on RLS policies on the pacientes table
  -- Users can only see patients they are authorized to access
  SELECT 
    p.id,
    -- Apply data masking based on user role
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
              AND pr.is_approved = true
              AND (
                -- Check if user is authorized for this patient
                (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
                OR (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
                OR (pr.tipo_usuario = 'admin')
              )
        ) THEN p.nome
        ELSE left(p.nome, 1) || '***' || right(p.nome, 1)
    END AS nome,
    
    -- CPF - only for healthcare professionals
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
              AND pr.is_approved = true
              AND (p.professional_id = auth.uid() OR pr.tipo_usuario = 'admin')
        ) THEN p.cpf
        ELSE '***.***.***-**'
    END AS cpf,
    
    -- Other fields with similar masking logic
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
              AND pr.is_approved = true
              AND (
                (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
                OR (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
                OR (pr.tipo_usuario = 'admin')
              )
        ) THEN p.data_nascimento
        ELSE NULL
    END AS data_nascimento,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
              AND pr.is_approved = true
              AND (
                (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
                OR (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
                OR (pr.tipo_usuario = 'admin')
              )
        ) THEN p.telefone
        ELSE '***-****'
    END AS telefone,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
              AND pr.is_approved = true
              AND (
                (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
                OR (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
                OR (pr.tipo_usuario = 'admin')
              )
        ) THEN p.email
        ELSE left(p.email, 1) || '***@' || split_part(p.email, '@', 2)
    END AS email,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
              AND pr.is_approved = true
              AND (
                (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
                OR (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
                OR (pr.tipo_usuario = 'admin')
              )
        ) THEN p.endereco
        ELSE '***-ACCESS-RESTRICTED-***'
    END AS endereco,
    
    -- Medical fields - only for healthcare professionals
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
              AND pr.is_approved = true
              AND (p.professional_id = auth.uid() OR pr.tipo_usuario = 'admin')
        ) THEN p.diagnostico
        ELSE '***-MEDICAL-DATA-RESTRICTED-***'
    END AS diagnostico,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
              AND pr.is_approved = true
              AND (p.professional_id = auth.uid() OR pr.tipo_usuario = 'admin')
        ) THEN p.historico_medico
        ELSE '***-MEDICAL-DATA-RESTRICTED-***'
    END AS historico_medico,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
              AND pr.is_approved = true
              AND (p.professional_id = auth.uid() OR pr.tipo_usuario = 'admin')
        ) THEN p.medicamentos_atuais
        ELSE '***-MEDICAL-DATA-RESTRICTED-***'
    END AS medicamentos_atuais,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
              AND pr.is_approved = true
              AND (p.professional_id = auth.uid() OR pr.tipo_usuario = 'admin')
        ) THEN p.observacoes
        ELSE '***-NOTES-RESTRICTED-***'
    END AS observacoes,
    
    -- Guardian info
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
              AND pr.is_approved = true
              AND (
                (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
                OR (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
                OR (pr.tipo_usuario = 'admin')
              )
        ) THEN p.responsavel_nome
        ELSE left(p.responsavel_nome, 1) || '***' || right(p.responsavel_nome, 1)
    END AS responsavel_nome,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
              AND pr.is_approved = true
              AND (
                (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
                OR (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
                OR (pr.tipo_usuario = 'admin')
              )
        ) THEN p.responsavel_email
        ELSE left(p.responsavel_email, 1) || '***@' || split_part(p.responsavel_email, '@', 2)
    END AS responsavel_email,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() 
              AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
              AND pr.is_approved = true
              AND (
                (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
                OR (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
                OR (pr.tipo_usuario = 'admin')
              )
        ) THEN p.responsavel_telefone
        ELSE '***-****'
    END AS responsavel_telefone,
    
    -- System fields - always visible
    p.status,
    p.professional_id,
    p.caregiver_id,
    p.usuario_cadastro_id,
    p.created_at,
    p.updated_at
  FROM public.pacientes p
  -- RLS policies on pacientes table will handle row-level access control
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_pacientes_safe() TO authenticated;

-- Add documentation
COMMENT ON FUNCTION public.get_pacientes_safe() IS 'Secure function to retrieve patient data with role-based access control and data masking. Uses SECURITY INVOKER to rely on RLS policies from the underlying pacientes table rather than SECURITY DEFINER functions.';

SELECT 'pacientes_safe view replaced with secure SECURITY INVOKER function' as status;