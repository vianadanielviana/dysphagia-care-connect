-- Fix security vulnerability in table_name table
-- Add user_id column for proper user isolation
ALTER TABLE public.table_name 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.table_name;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.table_name;

-- Create secure RLS policies that restrict access to authenticated users and their own data
CREATE POLICY "Users can view their own records" 
ON public.table_name 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own records" 
ON public.table_name 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records" 
ON public.table_name 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own records" 
ON public.table_name 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger to automatically set user_id on insert
CREATE TRIGGER set_table_name_user_id
BEFORE INSERT ON public.table_name
FOR EACH ROW
EXECUTE FUNCTION public.set_user_id_on_insert();

-- Add index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_table_name_user_id ON public.table_name(user_id);