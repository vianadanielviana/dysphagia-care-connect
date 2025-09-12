-- Enhanced Security Implementation for Patient Medical Records - Fixed Version
-- This migration implements stricter access controls, comprehensive audit trails, 
-- and data masking to address the security vulnerability

-- First, let's create a comprehensive access levels enum
CREATE TYPE patient_access_level AS ENUM ('none', 'basic', 'medical', 'full');

-- Create a patient access permissions table to control granular access
CREATE TABLE IF NOT EXISTS patient_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  access_level patient_access_level NOT NULL DEFAULT 'none',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  justification TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, patient_id)
);

-- Enable RLS on the new permissions table
ALTER TABLE patient_access_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for the permissions table
CREATE POLICY "Admins can manage all patient access permissions" 
ON patient_access_permissions FOR ALL 
USING (is_system_admin_secure());

CREATE POLICY "Users can view their own patient access permissions" 
ON patient_access_permissions FOR SELECT 
USING (user_id = auth.uid());

-- Create a secure function to get user's access level for a specific patient
CREATE OR REPLACE FUNCTION get_user_patient_access_level(target_user_id UUID, target_patient_id UUID)
RETURNS patient_access_level
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  patient_record RECORD;
  access_level patient_access_level := 'none';
BEGIN
  -- Get user profile
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE id = target_user_id AND is_approved = true;
  
  -- If user doesn't exist or isn't approved, return no access
  IF user_profile.id IS NULL THEN
    RETURN 'none';
  END IF;
  
  -- Get patient record
  SELECT * INTO patient_record 
  FROM pacientes 
  WHERE id = target_patient_id;
  
  -- If patient doesn't exist, return no access
  IF patient_record.id IS NULL THEN
    RETURN 'none';
  END IF;
  
  -- System admins get full access
  IF is_system_admin_secure() AND target_user_id = auth.uid() THEN
    RETURN 'full';
  END IF;
  
  -- Check if user is assigned professional
  IF patient_record.professional_id = target_user_id AND 
     user_profile.tipo_usuario IN ('fonoaudiologo', 'admin') THEN
    RETURN 'full';
  END IF;
  
  -- Check if user is assigned caregiver
  IF patient_record.caregiver_id = target_user_id AND 
     user_profile.tipo_usuario = 'cuidador' THEN
    RETURN 'medical';
  END IF;
  
  -- Check explicit permissions table
  SELECT pap.access_level INTO access_level
  FROM patient_access_permissions pap
  WHERE pap.user_id = target_user_id 
    AND pap.patient_id = target_patient_id
    AND pap.is_active = true
    AND (pap.expires_at IS NULL OR pap.expires_at > now());
  
  RETURN COALESCE(access_level, 'none');
END;
$$;

-- Update the existing RLS policies to be more restrictive
-- Drop existing permissive policies first
DROP POLICY IF EXISTS "pacientes_secure_select" ON pacientes;

-- Create new stricter policies that use the access level function
CREATE POLICY "pacientes_secure_select_enhanced" 
ON pacientes FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND get_user_patient_access_level(auth.uid(), id) != 'none'
);

-- Enhanced audit trigger for INSERT, UPDATE, DELETE operations
CREATE OR REPLACE FUNCTION comprehensive_patient_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  access_level patient_access_level;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  
  -- Get user's access level
  access_level := get_user_patient_access_level(auth.uid(), COALESCE(NEW.id, OLD.id));
  
  -- Log comprehensive audit trail
  INSERT INTO patient_access_log (
    user_id, patient_id, action, user_type, accessed_fields, metadata
  ) VALUES (
    auth.uid(), 
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'PATIENT_CREATED'
      WHEN TG_OP = 'UPDATE' THEN 'PATIENT_UPDATED'
      WHEN TG_OP = 'DELETE' THEN 'PATIENT_DELETED'
    END,
    COALESCE(user_profile.tipo_usuario, 'unknown'),
    ARRAY['*'],
    jsonb_build_object(
      'operation', TG_OP,
      'access_level', access_level,
      'timestamp', now(),
      'ip_address', inet_client_addr(),
      'user_approved', COALESCE(user_profile.is_approved, false),
      'security_audit_enhanced', true,
      'table_name', TG_TABLE_NAME,
      'compliance_required', true
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the audit trigger for INSERT, UPDATE, DELETE only
DROP TRIGGER IF EXISTS comprehensive_patient_audit_trigger ON pacientes;
CREATE TRIGGER comprehensive_patient_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION comprehensive_patient_audit();

-- Create a secure function for accessing patient data with proper logging
CREATE OR REPLACE FUNCTION get_patient_secure_with_audit(patient_uuid UUID)
RETURNS TABLE(
  id UUID, nome TEXT, cpf TEXT, data_nascimento DATE, telefone TEXT, 
  email TEXT, endereco TEXT, diagnostico TEXT, historico_medico TEXT, 
  medicamentos_atuais TEXT, observacoes TEXT, responsavel_nome TEXT,
  responsavel_telefone TEXT, responsavel_email TEXT, status TEXT,
  professional_id UUID, caregiver_id UUID, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ, user_access_level TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_level patient_access_level;
  patient_record pacientes%ROWTYPE;
BEGIN
  -- Get user's access level for this patient
  access_level := get_user_patient_access_level(auth.uid(), patient_uuid);
  
  -- Log access attempt with detailed information
  INSERT INTO patient_access_log (
    user_id, patient_id, action, user_type, metadata
  ) VALUES (
    auth.uid(), patient_uuid, 'SECURE_DATA_ACCESS',
    (SELECT tipo_usuario FROM profiles WHERE id = auth.uid()),
    jsonb_build_object(
      'access_level', access_level,
      'timestamp', now(),
      'ip_address', inet_client_addr(),
      'function', 'get_patient_secure_with_audit',
      'security_enhanced', true
    )
  );
  
  -- If no access, return nothing and log unauthorized attempt
  IF access_level = 'none' THEN
    INSERT INTO patient_access_log (
      user_id, patient_id, action, user_type, metadata
    ) VALUES (
      auth.uid(), patient_uuid, 'UNAUTHORIZED_ACCESS_BLOCKED',
      (SELECT tipo_usuario FROM profiles WHERE id = auth.uid()),
      jsonb_build_object(
        'timestamp', now(),
        'ip_address', inet_client_addr(),
        'reason', 'no_access_permissions',
        'security_level', 'critical'
      )
    );
    RETURN;
  END IF;
  
  -- Get patient record
  SELECT * INTO patient_record FROM pacientes WHERE pacientes.id = patient_uuid;
  
  -- Return data based on access level with appropriate masking
  RETURN QUERY SELECT
    patient_record.id,
    CASE 
      WHEN access_level IN ('full', 'medical') THEN patient_record.nome
      ELSE mask_medical_data(patient_record.nome, 'general', 'restricted')
    END as nome,
    CASE 
      WHEN access_level = 'full' THEN patient_record.cpf
      WHEN access_level = 'medical' THEN mask_medical_data(patient_record.cpf, 'cpf', 'authorized')
      ELSE mask_medical_data(patient_record.cpf, 'cpf', 'restricted')
    END as cpf,
    CASE 
      WHEN access_level IN ('full', 'medical') THEN patient_record.data_nascimento
      ELSE NULL
    END as data_nascimento,
    CASE 
      WHEN access_level = 'full' THEN patient_record.telefone
      ELSE mask_medical_data(patient_record.telefone, 'phone', 'restricted')
    END as telefone,
    CASE 
      WHEN access_level = 'full' THEN patient_record.email
      ELSE mask_medical_data(patient_record.email, 'email', 'restricted')
    END as email,
    CASE 
      WHEN access_level = 'full' THEN patient_record.endereco
      ELSE mask_medical_data(patient_record.endereco, 'address', 'restricted')
    END as endereco,
    CASE 
      WHEN access_level IN ('full', 'medical') THEN patient_record.diagnostico
      ELSE mask_medical_data(patient_record.diagnostico, 'medical_diagnosis', 'restricted')
    END as diagnostico,
    CASE 
      WHEN access_level IN ('full', 'medical') THEN patient_record.historico_medico
      ELSE mask_medical_data(patient_record.historico_medico, 'medical_history', 'restricted')
    END as historico_medico,
    CASE 
      WHEN access_level IN ('full', 'medical') THEN patient_record.medicamentos_atuais
      ELSE mask_medical_data(patient_record.medicamentos_atuais, 'medications', 'restricted')
    END as medicamentos_atuais,
    CASE 
      WHEN access_level IN ('full', 'medical') THEN patient_record.observacoes
      ELSE mask_medical_data(patient_record.observacoes, 'general', 'restricted')
    END as observacoes,
    CASE 
      WHEN access_level = 'full' THEN patient_record.responsavel_nome
      ELSE mask_medical_data(patient_record.responsavel_nome, 'general', 'restricted')
    END as responsavel_nome,
    CASE 
      WHEN access_level = 'full' THEN patient_record.responsavel_telefone
      ELSE mask_medical_data(patient_record.responsavel_telefone, 'phone', 'restricted')
    END as responsavel_telefone,
    CASE 
      WHEN access_level = 'full' THEN patient_record.responsavel_email
      ELSE mask_medical_data(patient_record.responsavel_email, 'email', 'restricted')
    END as responsavel_email,
    patient_record.status,
    patient_record.professional_id,
    patient_record.caregiver_id,
    patient_record.created_at,
    patient_record.updated_at,
    access_level::TEXT as user_access_level;
END;
$$;

-- Create a function to grant temporary access to patients (admin function)
CREATE OR REPLACE FUNCTION grant_patient_access(
  target_patient_id UUID,
  target_user_id UUID,
  access_level patient_access_level,
  expires_in_hours INTEGER DEFAULT 24,
  justification TEXT DEFAULT 'Emergency access'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins and assigned professionals can grant access
  IF NOT (is_system_admin_secure() OR 
          EXISTS (SELECT 1 FROM pacientes WHERE id = target_patient_id AND professional_id = auth.uid())) THEN
    RAISE EXCEPTION 'Insufficient privileges to grant patient access';
  END IF;
  
  -- Insert or update permission
  INSERT INTO patient_access_permissions (
    user_id, patient_id, access_level, granted_by, 
    expires_at, justification, is_active
  ) VALUES (
    target_user_id, target_patient_id, access_level, auth.uid(),
    now() + (expires_in_hours || ' hours')::interval, justification, true
  )
  ON CONFLICT (user_id, patient_id) 
  DO UPDATE SET 
    access_level = EXCLUDED.access_level,
    granted_by = EXCLUDED.granted_by,
    granted_at = now(),
    expires_at = EXCLUDED.expires_at,
    justification = EXCLUDED.justification,
    is_active = true,
    updated_at = now();
  
  -- Log the access grant
  INSERT INTO patient_access_log (
    user_id, patient_id, action, user_type, metadata
  ) VALUES (
    auth.uid(), target_patient_id, 'ACCESS_GRANTED',
    (SELECT tipo_usuario FROM profiles WHERE id = auth.uid()),
    jsonb_build_object(
      'target_user_id', target_user_id,
      'access_level', access_level,
      'expires_in_hours', expires_in_hours,
      'justification', justification,
      'timestamp', now()
    )
  );
  
  RETURN true;
END;
$$;

-- Add trigger to update updated_at on permissions table
CREATE TRIGGER update_patient_access_permissions_updated_at
  BEFORE UPDATE ON patient_access_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();