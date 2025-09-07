-- Add user_id column to contatos table for user-specific access control
ALTER TABLE public.contatos ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_contatos_user_id ON public.contatos(user_id);

-- Update existing records to assign them to the first admin user (temporary measure)
-- In a real scenario, you'd need to properly assign existing contacts to their rightful owners
UPDATE public.contatos 
SET user_id = (
  SELECT id FROM public.profiles 
  WHERE tipo_usuario = 'admin' OR is_admin = true 
  LIMIT 1
) 
WHERE user_id IS NULL;

-- Make user_id NOT NULL after assigning existing records
ALTER TABLE public.contatos ALTER COLUMN user_id SET NOT NULL;

-- Drop old admin-only policies
DROP POLICY IF EXISTS "System admins can delete contatos" ON public.contatos;
DROP POLICY IF EXISTS "System admins can insert contatos" ON public.contatos;
DROP POLICY IF EXISTS "System admins can update contatos" ON public.contatos;
DROP POLICY IF EXISTS "System admins can view contatos" ON public.contatos;

-- Create user-specific RLS policies
CREATE POLICY "Users can view their own contatos" 
ON public.contatos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contatos" 
ON public.contatos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contatos" 
ON public.contatos 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contatos" 
ON public.contatos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin users can still access all contatos for management purposes
CREATE POLICY "System admins can view all contatos" 
ON public.contatos 
FOR SELECT 
USING (is_system_admin_secure());

CREATE POLICY "System admins can update all contatos" 
ON public.contatos 
FOR UPDATE 
USING (is_system_admin_secure())
WITH CHECK (is_system_admin_secure());

CREATE POLICY "System admins can delete all contatos" 
ON public.contatos 
FOR DELETE 
USING (is_system_admin_secure());

-- Create trigger to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_contatos_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_set_contatos_user_id
    BEFORE INSERT ON public.contatos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_contatos_user_id();