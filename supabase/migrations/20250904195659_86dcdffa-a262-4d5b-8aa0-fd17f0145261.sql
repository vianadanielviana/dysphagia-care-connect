-- Atualizar as políticas RLS da tabela pacientes para dar acesso aos fonoaudiólogos e cuidadores

-- Primeiro, remover as políticas existentes
DROP POLICY IF EXISTS "Users can view patients they created or are assigned to" ON public.pacientes;
DROP POLICY IF EXISTS "Users can create patients" ON public.pacientes;  
DROP POLICY IF EXISTS "Users can update their patients" ON public.pacientes;
DROP POLICY IF EXISTS "Users can delete their patients" ON public.pacientes;

-- Criar políticas mais permissivas para fonoaudiólogos e cuidadores
CREATE POLICY "Approved users can view all patients" 
ON public.pacientes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND tipo_usuario IN ('fonoaudiologo', 'cuidador', 'admin')
  ) 
  OR (auth.jwt() ->> 'email') = 'viana.vianadaniel@outlook.com'
);

CREATE POLICY "Approved users can create patients" 
ON public.pacientes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND tipo_usuario IN ('fonoaudiologo', 'cuidador', 'admin')
  ) 
  OR (auth.jwt() ->> 'email') = 'viana.vianadaniel@outlook.com'
);

CREATE POLICY "Approved users can update all patients" 
ON public.pacientes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND tipo_usuario IN ('fonoaudiologo', 'cuidador', 'admin')
  ) 
  OR (auth.jwt() ->> 'email') = 'viana.vianadaniel@outlook.com'
);

CREATE POLICY "Approved users can delete all patients" 
ON public.pacientes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND tipo_usuario IN ('fonoaudiologo', 'cuidador', 'admin')
  ) 
  OR (auth.jwt() ->> 'email') = 'viana.vianadaniel@outlook.com'
);