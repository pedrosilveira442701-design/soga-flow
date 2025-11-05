-- Remover limite de tamanho do bucket 'arquivos'
UPDATE storage.buckets
SET file_size_limit = NULL
WHERE id = 'arquivos';