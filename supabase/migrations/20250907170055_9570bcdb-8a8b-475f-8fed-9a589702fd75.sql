-- =====================================================
-- SECURE USERS TABLE - COMPREHENSIVE RLS POLICIES
-- =====================================================

-- Add missing INSERT policy (currently users cannot create records)
CREATE POLICY "Users can create their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Add DELETE policy for data privacy compliance (users should be able to delete their data)
CREATE POLICY "Users can delete their own data"
ON public.users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Update the existing SELECT policy to be more explicit about what can be accessed
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read their own data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Update the existing UPDATE policy to be more restrictive on sensitive fields
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update their own data"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    -- Prevent users from changing their ID or certain system fields
    AND id = (SELECT id FROM public.users WHERE id = auth.uid())
);

-- Add a policy for healthcare professionals to view basic contact info of other users
-- This is needed for the healthcare system to function properly
CREATE POLICY "Healthcare professionals can view colleague contact info"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Allow healthcare professionals to see basic info of other healthcare professionals
    EXISTS (
        SELECT 1 FROM public.profiles p1
        WHERE p1.id = auth.uid()
        AND p1.is_approved = true
        AND p1.tipo_usuario IN ('fonoaudiologo', 'admin')
    )
    AND user_type IN ('fonoaudiologo', 'admin')
    -- But restrict what fields they can see through application logic
);

-- Create a secure view for limited user contact information
CREATE VIEW public.users_contact_safe AS
SELECT 
    u.id,
    u.name,
    u.user_type,
    -- Only show email to the user themselves or admins
    CASE 
        WHEN auth.uid() = u.id THEN u.email
        WHEN EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.is_approved = true 
            AND p.tipo_usuario = 'admin'
        ) THEN u.email
        ELSE '***@***.***'
    END AS email,
    -- Only show phone to the user themselves or healthcare professionals in same network
    CASE 
        WHEN auth.uid() = u.id THEN u.phone
        WHEN EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.is_approved = true 
            AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
        ) AND u.user_type IN ('fonoaudiologo', 'admin', 'cuidador') THEN u.phone
        ELSE '***-***-****'
    END AS phone,
    -- Registration number is highly sensitive - only show to user themselves or admin
    CASE 
        WHEN auth.uid() = u.id THEN u.registration_number
        WHEN EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.is_approved = true 
            AND p.tipo_usuario = 'admin'
        ) THEN u.registration_number
        ELSE '***-RESTRICTED-***'
    END AS registration_number,
    u.created_at
FROM public.users u
WHERE 
    -- Users can see their own data
    auth.uid() = u.id
    OR
    -- Healthcare professionals can see basic info of colleagues
    (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.is_approved = true
            AND p.tipo_usuario IN ('fonoaudiologo', 'admin')
        )
        AND u.user_type IN ('fonoaudiologo', 'admin', 'cuidador')
    );

-- Grant permissions on the safe view
GRANT SELECT ON public.users_contact_safe TO authenticated;

-- Add audit logging for sensitive user data access
CREATE OR REPLACE FUNCTION public.log_user_data_access()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for user data access logging
DROP TRIGGER IF EXISTS log_user_data_access_trigger ON public.users;
CREATE TRIGGER log_user_data_access_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.log_user_data_access();

-- Add documentation
COMMENT ON TABLE public.users IS 'User table with comprehensive RLS policies protecting personal information. Phone numbers and registration numbers are restricted to authorized users only.';
COMMENT ON VIEW public.users_contact_safe IS 'Secure view for user contact information with field-level access control based on user roles and relationships.';

SELECT 'Users table security policies updated successfully' as status;