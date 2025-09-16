-- Remove conflicting permissive policy on pacientes
DROP POLICY IF EXISTS "pacientes_strict_authenticated_only" ON public.pacientes;

-- Optional: ensure no other broad ALL policies exist for authenticated users on pacientes
-- (No-op if none exist)

-- Reconfirm: keep deny anonymous for safety; keep specific SELECT/INSERT/UPDATE/DELETE policies
-- No further changes needed.