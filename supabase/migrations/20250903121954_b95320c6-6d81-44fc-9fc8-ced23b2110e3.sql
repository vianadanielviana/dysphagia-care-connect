-- Fix critical security issue: cadastro table public access
-- Update existing records to be owned by admin user (to prevent data loss)
UPDATE public.cadastro 
SET user_id = (
  SELECT id FROM public.profiles 
  WHERE email = 'viana.vianadaniel@outlook.com' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Drop the dangerous public read policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cadastro;

-- Drop the overly permissive insert policy  
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.cadastro;

-- Create secure RLS policies for user-specific access
CREATE POLICY "Users can view their own cadastro records" 
ON public.cadastro 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cadastro records" 
ON public.cadastro 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cadastro records" 
ON public.cadastro 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cadastro records" 
ON public.cadastro 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_cadastro_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_cadastro_user_id_trigger
    BEFORE INSERT ON public.cadastro
    FOR EACH ROW
    EXECUTE FUNCTION public.set_cadastro_user_id();