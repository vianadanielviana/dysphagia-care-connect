-- Fix critical security vulnerability in workflow table
-- Private chat conversations are currently publicly accessible

-- Step 1: Add user_id column to track ownership
ALTER TABLE public.workflow ADD COLUMN user_id UUID;

-- Step 2: Drop existing insecure RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.workflow;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.workflow;

-- Step 3: Create secure RLS policies that restrict access to authenticated users and their own data
CREATE POLICY "Users can view their own workflow messages" 
ON public.workflow 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflow messages" 
ON public.workflow 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow messages" 
ON public.workflow 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflow messages" 
ON public.workflow 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 4: Create trigger to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_workflow_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER workflow_set_user_id
    BEFORE INSERT ON public.workflow
    FOR EACH ROW
    EXECUTE FUNCTION public.set_workflow_user_id();

-- Step 5: Add index for performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_workflow_user_id ON public.workflow(user_id);

-- NOTE: Existing records in workflow table will have NULL user_id
-- These will be inaccessible until manually assigned to appropriate users
-- Consider running a data cleanup query to assign orphaned records or delete them