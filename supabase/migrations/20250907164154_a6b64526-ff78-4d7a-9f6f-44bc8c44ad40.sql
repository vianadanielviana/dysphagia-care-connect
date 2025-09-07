-- =====================================================
-- ADD RLS POLICIES TO PACIENTES_SAFE VIEW
-- =====================================================

-- Enable Row Level Security on the pacientes_safe view
ALTER TABLE public.pacientes_safe ENABLE ROW LEVEL SECURITY;

-- Policy for authorized users to view patient data
CREATE POLICY "Authorized users can view patient data"
ON public.pacientes_safe
FOR SELECT
TO authenticated
USING (
  -- Only allow access if user is authorized for this patient
  public.is_authorized_for_patient(id) OR public.is_system_admin()
);

-- Add comment for documentation
COMMENT ON POLICY "Authorized users can view patient data" ON public.pacientes_safe IS 
'Restricts access to patient data based on role-based authorization. Healthcare professionals can only see patients they are assigned to, and caregivers can only see their own patients. System admins have full access.';

-- Grant SELECT permission to authenticated users (RLS will handle the filtering)
GRANT SELECT ON public.pacientes_safe TO authenticated;