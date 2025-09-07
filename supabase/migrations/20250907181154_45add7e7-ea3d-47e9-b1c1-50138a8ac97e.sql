-- Criar bucket de storage para documentos dos pacientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-documents', 
  'patient-documents', 
  false,  -- Não público por segurança
  10485760, -- 10MB limite
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
);

-- Criar políticas RLS seguras para o bucket de documentos dos pacientes
-- SELECT: Apenas fonoaudiólogos responsáveis e admins podem ver
CREATE POLICY "secure_patient_documents_select" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  auth.uid() IS NOT NULL AND (
    -- Administradores podem ver todos os documentos
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND (tipo_usuario = 'admin' OR is_admin = true)
    )
    OR
    -- Fonoaudiólogos podem ver documentos dos seus pacientes
    EXISTS (
      SELECT 1 FROM public.pacientes p
      JOIN public.profiles prof ON prof.id = auth.uid()
      WHERE p.professional_id = auth.uid()
      AND prof.is_approved = true 
      AND prof.tipo_usuario IN ('fonoaudiologo', 'admin')
      AND (storage.foldername(name))[1] = p.id::text
    )
    OR
    -- Cuidadores podem ver documentos dos seus pacientes
    EXISTS (
      SELECT 1 FROM public.pacientes p
      JOIN public.profiles prof ON prof.id = auth.uid()
      WHERE p.caregiver_id = auth.uid()
      AND prof.is_approved = true 
      AND prof.tipo_usuario = 'cuidador'
      AND (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- INSERT: Apenas fonoaudiólogos e cuidadores responsáveis podem fazer upload
CREATE POLICY "secure_patient_documents_insert" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents' AND
  auth.uid() IS NOT NULL AND (
    -- Administradores podem fazer upload para qualquer paciente
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND (tipo_usuario = 'admin' OR is_admin = true)
    )
    OR
    -- Fonoaudiólogos podem fazer upload para seus pacientes
    EXISTS (
      SELECT 1 FROM public.pacientes p
      JOIN public.profiles prof ON prof.id = auth.uid()
      WHERE p.professional_id = auth.uid()
      AND prof.is_approved = true 
      AND prof.tipo_usuario IN ('fonoaudiologo', 'admin')
      AND (storage.foldername(name))[1] = p.id::text
    )
    OR
    -- Cuidadores podem fazer upload para seus pacientes
    EXISTS (
      SELECT 1 FROM public.pacientes p
      JOIN public.profiles prof ON prof.id = auth.uid()
      WHERE p.caregiver_id = auth.uid()
      AND prof.is_approved = true 
      AND prof.tipo_usuario = 'cuidador'
      AND (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- UPDATE: Apenas fonoaudiólogos responsáveis e admins podem atualizar
CREATE POLICY "secure_patient_documents_update" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND (tipo_usuario = 'admin' OR is_admin = true)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pacientes p
      JOIN public.profiles prof ON prof.id = auth.uid()
      WHERE p.professional_id = auth.uid()
      AND prof.is_approved = true 
      AND prof.tipo_usuario IN ('fonoaudiologo', 'admin')
      AND (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- DELETE: Apenas fonoaudiólogos responsáveis e admins podem deletar
CREATE POLICY "secure_patient_documents_delete" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND (tipo_usuario = 'admin' OR is_admin = true)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pacientes p
      JOIN public.profiles prof ON prof.id = auth.uid()
      WHERE p.professional_id = auth.uid()
      AND prof.is_approved = true 
      AND prof.tipo_usuario IN ('fonoaudiologo', 'admin')
      AND (storage.foldername(name))[1] = p.id::text
    )
  )
);