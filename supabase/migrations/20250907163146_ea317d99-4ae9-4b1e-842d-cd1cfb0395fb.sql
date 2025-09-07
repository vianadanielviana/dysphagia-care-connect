-- =====================================================
-- CREATE MISSING SECURITY FUNCTIONS FOR PACIENTES_SAFE VIEW
-- =====================================================

-- 1. Create secure is_system_admin function
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
      AND tipo_usuario = 'admin'
  );
$$;

-- 2. Create secure mask_sensitive_data function
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(
  input_data text,
  mask_type text DEFAULT 'full'
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return null/empty if input is null/empty
  IF input_data IS NULL OR input_data = '' THEN
    RETURN input_data;
  END IF;
  
  -- Different masking strategies based on type
  CASE mask_type
    WHEN 'partial' THEN
      -- Show first and last characters, mask middle
      IF length(input_data) <= 2 THEN
        RETURN repeat('*', length(input_data));
      ELSE
        RETURN left(input_data, 1) || repeat('*', greatest(length(input_data) - 2, 1)) || right(input_data, 1);
      END IF;
    WHEN 'email' THEN
      -- Mask email preserving domain
      IF input_data LIKE '%@%' THEN
        RETURN left(input_data, 1) || '***@' || split_part(input_data, '@', 2);
      ELSE
        RETURN '***-MASKED-***';
      END IF;
    WHEN 'cpf' THEN
      -- Mask CPF showing only last 3 digits
      IF length(input_data) = 11 THEN
        RETURN '***.***.***-' || right(input_data, 2);
      ELSE
        RETURN '***-MASKED-***';
      END IF;
    WHEN 'phone' THEN
      -- Mask phone showing only last 4 digits
      IF length(input_data) >= 4 THEN
        RETURN repeat('*', length(input_data) - 4) || right(input_data, 4);
      ELSE
        RETURN '***-MASKED-***';
      END IF;
    ELSE
      -- Default full masking
      RETURN '***-RESTRICTED-***';
  END CASE;
END;
$$;

-- 3. Recreate the pacientes_safe view with proper security
CREATE OR REPLACE VIEW public.pacientes_safe AS
SELECT 
    p.id,
    -- Name - partial masking for non-authorized users
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin() 
        THEN p.nome
        ELSE public.mask_sensitive_data(p.nome, 'partial')
    END AS nome,
    
    -- CPF - highly sensitive, only for healthcare professionals
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.cpf
        ELSE public.mask_sensitive_data(p.cpf, 'cpf')
    END AS cpf,
    
    -- Birth date - less sensitive
    p.data_nascimento,
    
    -- Phone - partial masking for non-authorized
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.telefone
        ELSE public.mask_sensitive_data(p.telefone, 'phone')
    END AS telefone,
    
    -- Email - partial masking for non-authorized
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.email
        ELSE public.mask_sensitive_data(p.email, 'email')
    END AS email,
    
    -- Address - sensitive, authorized users only
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.endereco
        ELSE '***-ACCESS-RESTRICTED-***'
    END AS endereco,
    
    -- Medical data - only healthcare professionals
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.diagnostico
        ELSE '***-MEDICAL-DATA-RESTRICTED-***'
    END AS diagnostico,
    
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.historico_medico
        ELSE '***-MEDICAL-DATA-RESTRICTED-***'
    END AS historico_medico,
    
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.medicamentos_atuais
        ELSE '***-MEDICAL-DATA-RESTRICTED-***'
    END AS medicamentos_atuais,
    
    -- Observations - healthcare professionals only
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.observacoes
        ELSE '***-NOTES-RESTRICTED-***'
    END AS observacoes,
    
    -- Guardian info - authorized users only
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.responsavel_nome
        ELSE public.mask_sensitive_data(p.responsavel_nome, 'partial')
    END AS responsavel_nome,
    
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.responsavel_email
        ELSE public.mask_sensitive_data(p.responsavel_email, 'email')
    END AS responsavel_email,
    
    CASE
        WHEN (
          public.is_authorized_for_patient(p.id) 
          AND EXISTS ( SELECT 1 FROM public.profiles pr
               WHERE pr.id = auth.uid() 
                 AND pr.tipo_usuario IN ('fonoaudiologo', 'admin', 'cuidador') 
                 AND pr.is_approved = true
          )
        ) OR public.is_system_admin()
        THEN p.responsavel_telefone
        ELSE public.mask_sensitive_data(p.responsavel_telefone, 'phone')
    END AS responsavel_telefone,
    
    -- System fields - always show
    p.status,
    p.professional_id,
    p.caregiver_id,
    p.usuario_cadastro_id,
    p.created_at,
    p.updated_at
FROM public.pacientes p
WHERE public.is_authorized_for_patient(p.id) OR public.is_system_admin();

-- 4. Grant appropriate permissions
GRANT SELECT ON public.pacientes_safe TO authenticated;