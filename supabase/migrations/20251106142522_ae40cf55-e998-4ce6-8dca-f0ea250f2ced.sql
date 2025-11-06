-- Criar políticas de storage para arquivos de propostas
-- Permitir que usuários vejam seus próprios arquivos de propostas
CREATE POLICY "Users can view their proposta files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'arquivos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'proposta'
);

-- Permitir que usuários façam upload de arquivos de propostas
CREATE POLICY "Users can upload proposta files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'arquivos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'proposta'
);

-- Permitir que usuários atualizem seus próprios arquivos de propostas
CREATE POLICY "Users can update their proposta files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'arquivos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'proposta'
);

-- Permitir que usuários deletem seus próprios arquivos de propostas
CREATE POLICY "Users can delete their proposta files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'arquivos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'proposta'
);