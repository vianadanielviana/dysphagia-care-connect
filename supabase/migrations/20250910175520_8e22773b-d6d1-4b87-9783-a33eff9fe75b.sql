-- FIX CRITICAL SECURITY DEFINER VIEW ISSUE
-- Replace the security definer view with a proper security function approach

-- Remove the problematic view
DROP VIEW IF EXISTS public.pacientes_secure_view;

-- Create a secure function instead of a view to avoid SECURITY DEFINER view issues
CREATE OR REPLACE FUNCTION public.get_pacientes_secure_list()
RETURNS TABLE(
    id uuid,
    nome text,
    cpf text,
    data_nascimento date,
    status text,
    created_at timestamp with time zone,
    access_level text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        public.mask_medical_data(p.nome, 'general', 
            CASE 
                WHEN public.is_system_admin_secure() THEN 'full'
                WHEN p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN 'authorized'
                ELSE 'restricted'
            END
        ) as nome,
        public.mask_medical_data(p.cpf, 'cpf',
            CASE 
                WHEN public.is_system_admin_secure() THEN 'full'
                WHEN p.professional_id = auth.uid() OR p.caregiver_id = auth.uid() THEN 'authorized'
                ELSE 'restricted'
            END
        ) as cpf,
        CASE 
            WHEN public.is_system_admin_secure() 
            OR p.professional_id = auth.uid() 
            OR p.caregiver_id = auth.uid() 
            THEN p.data_nascimento 
            ELSE NULL 
        END as data_nascimento,
        p.status,
        p.created_at,
        CASE 
            WHEN public.is_system_admin_secure() 
            OR p.professional_id = auth.uid() 
            OR p.caregiver_id = auth.uid() 
            THEN 'authorized' 
            ELSE 'restricted' 
        END as access_level
    FROM public.pacientes p
    WHERE (
        public.is_system_admin_secure()
        OR p.professional_id = auth.uid()
        OR p.caregiver_id = auth.uid()
    );
END;
$$;