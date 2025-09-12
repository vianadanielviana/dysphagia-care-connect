-- Enhanced security for contatos table
-- Drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "System admins can delete all contatos" ON public.contatos;
DROP POLICY IF EXISTS "System admins can update all contatos" ON public.contatos;  
DROP POLICY IF EXISTS "System admins can view all contatos" ON public.contatos;
DROP POLICY IF EXISTS "Users can create their own contatos" ON public.contatos;
DROP POLICY IF EXISTS "Users can delete their own contatos" ON public.contatos;
DROP POLICY IF EXISTS "Users can update their own contatos" ON public.contatos;
DROP POLICY IF EXISTS "Users can view their own contatos" ON public.contatos;
DROP POLICY IF EXISTS "contatos_deny_anonymous" ON public.contatos;
DROP POLICY IF EXISTS "contatos_require_authentication" ON public.contatos;

-- Create enhanced security function for contact access
CREATE OR REPLACE FUNCTION public.can_access_contact(contact_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.is_approved = true
    AND (
      -- User can access their own contacts
      (contact_user_id = auth.uid()) 
      OR 
      -- System admins can access all contacts
      (p.tipo_usuario = 'admin' OR p.is_admin = true)
    )
  );
$$;

-- Create contact access logging function
CREATE OR REPLACE FUNCTION public.log_contact_access(contact_id integer, action_type text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  INSERT INTO public.patient_access_log (
    user_id, action, user_type, metadata
  ) VALUES (
    auth.uid(), 
    'CONTACT_' || action_type,
    COALESCE((SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()), 'unknown'),
    jsonb_build_object(
      'contact_id', contact_id,
      'timestamp', now(),
      'ip_address', inet_client_addr(),
      'table', 'contatos'
    )
  );
$$;

-- Create comprehensive RLS policies with enhanced security
CREATE POLICY "contatos_secure_select"
ON public.contatos
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.can_access_contact(user_id)
);

CREATE POLICY "contatos_secure_insert"
ON public.contatos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_approved = true
  )
);

CREATE POLICY "contatos_secure_update"
ON public.contatos
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.can_access_contact(user_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND public.can_access_contact(user_id)
);

CREATE POLICY "contatos_secure_delete"
ON public.contatos
FOR DELETE  
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.can_access_contact(user_id)
);

-- Explicit denial policy for unauthenticated users
CREATE POLICY "contatos_deny_unauthenticated"
ON public.contatos
FOR ALL
TO anon, public
USING (false);

-- Create trigger for audit logging
CREATE OR REPLACE FUNCTION public.audit_contact_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all contact access for audit trail
  PERFORM public.log_contact_access(
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'CREATED'
      WHEN TG_OP = 'UPDATE' THEN 'UPDATED'  
      WHEN TG_OP = 'DELETE' THEN 'DELETED'
      ELSE 'ACCESSED'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit trigger to contatos table
DROP TRIGGER IF EXISTS audit_contatos_access ON public.contatos;
CREATE TRIGGER audit_contatos_access
  AFTER INSERT OR UPDATE OR DELETE ON public.contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_contact_access();

-- Create function to get contacts with data masking for enhanced security
CREATE OR REPLACE FUNCTION public.get_contacts_secure()
RETURNS TABLE(
  id integer,
  nome text,
  telefone text,
  email text,
  categoria text,
  status text,
  created_at timestamp without time zone,
  access_level text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
  is_admin boolean := false;
BEGIN
  -- Get user profile and check admin status
  SELECT * INTO user_profile FROM public.profiles WHERE profiles.id = auth.uid();
  
  IF user_profile.id IS NULL THEN
    RETURN; -- No access for unauthenticated users
  END IF;
  
  is_admin := (user_profile.tipo_usuario = 'admin' OR user_profile.is_admin = true);
  
  -- Log the access attempt
  PERFORM public.log_contact_access(0, 'LIST_ACCESSED');
  
  -- Return contacts with appropriate data visibility
  RETURN QUERY 
  SELECT 
    c.id,
    c.nome,
    CASE 
      WHEN is_admin OR c.user_id = auth.uid() THEN c.telefone
      ELSE public.mask_sensitive_data(c.telefone, 'phone')
    END as telefone,
    CASE 
      WHEN is_admin OR c.user_id = auth.uid() THEN c.email  
      ELSE public.mask_sensitive_data(c.email, 'email')
    END as email,
    c.categoria,
    c.status,
    c.created_at,
    CASE 
      WHEN is_admin THEN 'admin'
      WHEN c.user_id = auth.uid() THEN 'owner'
      ELSE 'restricted'
    END as access_level
  FROM public.contatos c
  WHERE (
    is_admin OR c.user_id = auth.uid()
  )
  ORDER BY c.created_at DESC;
END;
$$;