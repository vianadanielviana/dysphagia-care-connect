-- Fix critical security vulnerability: Ensure RLS is enabled and properly configured

-- 1. Ensure RLS is enabled on critical tables
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop any overly permissive policies that might exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.pacientes;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.pacientes;
DROP POLICY IF EXISTS "Enable update for all users" ON public.pacientes;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.pacientes;

-- 3. Ensure no anonymous access to sensitive tables by adding explicit deny policies
CREATE POLICY "pacientes_deny_anonymous_access" 
ON public.pacientes 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "contatos_deny_anonymous_access" 
ON public.contatos 
FOR ALL 
TO anon 
USING (false);

-- 4. Create comprehensive security function to validate all patient access
CREATE OR REPLACE FUNCTION public.validate_patient_access_comprehensive()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'SECURITY_VIOLATION: Authentication required for patient data access';
    END IF;
    
    -- Ensure user is approved
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_approved = true
    ) THEN
        RAISE EXCEPTION 'SECURITY_VIOLATION: User must be approved to access patient data';
    END IF;
    
    -- Log all access attempts
    INSERT INTO public.patient_access_log (
        user_id, patient_id, action, user_type, metadata
    ) VALUES (
        auth.uid(), 
        COALESCE(NEW.id, OLD.id), 
        TG_OP,
        (SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()),
        jsonb_build_object(
            'timestamp', now(),
            'security_check', 'comprehensive_validation',
            'table', TG_TABLE_NAME
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Add the comprehensive security trigger to pacientes table
DROP TRIGGER IF EXISTS comprehensive_security_check ON public.pacientes;
CREATE TRIGGER comprehensive_security_check
    BEFORE INSERT OR UPDATE OR DELETE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.validate_patient_access_comprehensive();

-- 6. Revoke all public access to ensure no bypass routes
REVOKE ALL ON public.pacientes FROM PUBLIC;
REVOKE ALL ON public.pacientes FROM anon;
REVOKE ALL ON public.contatos FROM PUBLIC;
REVOKE ALL ON public.contatos FROM anon;

-- 7. Grant only necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatos TO authenticated;

-- 8. Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 9. Create emergency security monitoring function
CREATE OR REPLACE FUNCTION public.emergency_security_check()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if any anonymous access exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_privileges 
        WHERE grantee = 'anon' 
        AND table_name IN ('pacientes', 'contatos')
        AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    ) THEN
        -- Log security breach attempt
        INSERT INTO public.patient_access_log (
            user_id, action, user_type, metadata
        ) VALUES (
            NULL, 'SECURITY_BREACH_DETECTED', 'system',
            jsonb_build_object(
                'alert_level', 'critical',
                'message', 'Anonymous access detected to sensitive tables',
                'timestamp', now()
            )
        );
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;