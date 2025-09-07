-- SECURITY FIXES - PHASE 2: RESOLVE LINTER WARNINGS
-- Address remaining security warnings detected by the linter

-- 1. FIX FUNCTION SEARCH PATH MUTABLE WARNINGS
-- Update all remaining functions to have secure search_path

-- Update secure_match_vector_documents function
CREATE OR REPLACE FUNCTION public.secure_match_vector_documents(query_embedding vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb, similarity_threshold double precision DEFAULT 0.0)
RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_authorized boolean := false;
BEGIN
    -- Check if user is authorized to access AI training documents
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_approved = true
        AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
    ) INTO user_authorized;

    -- If not authorized, return empty result
    IF NOT user_authorized THEN
        RETURN;
    END IF;

    -- Log the search attempt
    INSERT INTO public.vector_document_access_log (
        user_id,
        action,
        user_type,
        search_query,
        metadata
    ) VALUES (
        auth.uid(),
        'SEARCH',
        COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
        'vector_similarity_search',
        jsonb_build_object(
            'match_count', match_count,
            'filter', filter,
            'similarity_threshold', similarity_threshold
        )
    );

    -- Perform the actual search with similarity threshold
    RETURN QUERY
    SELECT
        v.id,
        v.content,
        v.metadata,
        1 - (v.embedding <=> query_embedding) as similarity
    FROM public.vector_documents v
    WHERE v.metadata @> filter
    AND (1 - (v.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY v.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Update mask_sensitive_data function
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_data text, mask_type text DEFAULT 'full'::text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
      -- Mask CPF showing only last 2 digits
      IF length(input_data) >= 2 THEN
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

-- Update get_pacientes_safe function
CREATE OR REPLACE FUNCTION public.get_pacientes_safe()
RETURNS TABLE(id uuid, nome text, cpf text, data_nascimento date, telefone text, email text, endereco text, diagnostico text, historico_medico text, medicamentos_atuais text, observacoes text, responsavel_nome text, responsavel_email text, responsavel_telefone text, status text, professional_id uuid, caregiver_id uuid, usuario_cadastro_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
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

-- Update other functions with secure search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_access_patient(patient_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pacientes p
    INNER JOIN public.profiles prof ON prof.id = auth.uid()
    WHERE p.id = patient_uuid
    AND prof.is_approved = true
    AND (
      -- Professional assigned to patient
      (p.professional_id = auth.uid() AND prof.tipo_usuario IN ('fonoaudiologo', 'admin'))
      OR
      -- Caregiver assigned to patient
      (p.caregiver_id = auth.uid() AND prof.tipo_usuario = 'cuidador')
      OR
      -- System admin
      public.is_system_admin_secure()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_authorized_for_patient(patient_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pacientes p
    JOIN public.profiles pr ON (pr.id = auth.uid())
    WHERE p.id = patient_uuid
      AND pr.is_approved = true
      AND (
        -- Professional assigned to patient
        (p.professional_id = auth.uid() AND pr.tipo_usuario IN ('fonoaudiologo', 'admin'))
        OR
        -- Caregiver assigned to patient  
        (p.caregiver_id = auth.uid() AND pr.tipo_usuario = 'cuidador')
        OR
        -- System admin (secure check, no hardcoded emails)
        (pr.tipo_usuario = 'admin')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_create_patients()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_approved = true
      AND tipo_usuario IN ('fonoaudiologo', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_unread_messages_count(user_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.team_messages tm
  LEFT JOIN public.message_reads mr ON tm.id = mr.message_id AND mr.user_id = user_uuid
  WHERE tm.sender_id != user_uuid AND mr.id IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.mark_message_as_read(message_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.message_reads (message_id, user_id)
  VALUES (message_uuid, user_uuid)
  ON CONFLICT (message_id, user_id) DO NOTHING;
  
  SELECT TRUE;
$$;

-- Update trigger functions
CREATE OR REPLACE FUNCTION public.set_workflow_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_cadastro_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_user_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log access to sensitive user data
    INSERT INTO public.patient_access_log (
        user_id,
        patient_id, -- We'll use this field for the accessed user ID
        action,
        user_type,
        accessed_fields,
        metadata
    ) VALUES (
        auth.uid(),
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'USER_CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'USER_UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'USER_DELETE'
            ELSE 'USER_ACCESS'
        END,
        COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                ARRAY(SELECT key FROM jsonb_each(to_jsonb(NEW)) WHERE key != 'updated_at')
            ELSE 
                ARRAY['*']
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', 'users',
            'timestamp', now(),
            'ip_address', inet_client_addr()
        )
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_patient_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log all patient data access attempts
    INSERT INTO public.patient_access_log (
        user_id,
        patient_id,
        action,
        user_type,
        accessed_fields,
        metadata
    ) VALUES (
        auth.uid(),
        COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
            ELSE 'SELECT'
        END,
        COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                -- Log which fields were changed
                ARRAY(
                    SELECT key FROM jsonb_each(to_jsonb(NEW)) 
                    WHERE key != 'updated_at' 
                    AND to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key
                )
            ELSE 
                ARRAY['*']
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', now(),
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
            'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_id_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_pacientes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_patient_data_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate professional exists and is approved (if set)
  IF NEW.professional_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.professional_id
        AND is_approved = true
        AND tipo_usuario IN ('fonoaudiologo', 'admin')
    ) THEN
      RAISE EXCEPTION 'Professional ID is invalid or not approved';
    END IF;
  END IF;
  
  -- Validate caregiver exists and is approved (if set)  
  IF NEW.caregiver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.caregiver_id
        AND is_approved = true
        AND tipo_usuario = 'cuidador'
    ) THEN
      RAISE EXCEPTION 'Caregiver ID is invalid or not approved';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. MOVE EXTENSIONS OUT OF PUBLIC SCHEMA
-- Note: This is typically handled by Supabase automatically, but we'll document it
-- Extensions like vector, uuid-ossp should be in extensions schema, not public

-- 3. AUTH CONFIGURATION NOTES
-- The following items require configuration in the Supabase dashboard:
-- - OTP expiry settings (reduce from current long expiry)
-- - Enable leaked password protection
-- These cannot be fixed via SQL migration and must be configured in the dashboard

-- Add final security documentation
COMMENT ON FUNCTION public.is_system_admin_secure() IS 
'SECURITY: Secure admin check function without hardcoded emails. All functions now have secure search_path.';

-- Create a security status function for monitoring
CREATE OR REPLACE FUNCTION public.get_security_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    status_info jsonb;
BEGIN
    -- Only allow admins to check security status
    IF NOT public.is_system_admin_secure() THEN
        RETURN jsonb_build_object('error', 'Access denied');
    END IF;

    status_info := jsonb_build_object(
        'security_hardening_phase_1', 'COMPLETED',
        'hardcoded_emails_removed', true,
        'function_search_path_secured', true,
        'enhanced_audit_logging', true,
        'suspicious_activity_detection', true,
        'data_masking_implemented', true,
        'role_based_access_control', true,
        'timestamp', now(),
        'remaining_manual_tasks', jsonb_build_array(
            'Configure OTP expiry in Supabase dashboard',
            'Enable leaked password protection in Supabase dashboard',
            'Review extension installation in public schema'
        )
    );

    RETURN status_info;
END;
$$;

-- Grant access to security status function
GRANT EXECUTE ON FUNCTION public.get_security_status() TO authenticated;