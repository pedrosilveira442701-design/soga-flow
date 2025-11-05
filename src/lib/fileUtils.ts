import {
  FileText,
  Image,
  FileSpreadsheet,
  FileCode,
  File,
  Archive,
  FileQuestion,
} from "lucide-react";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const TIPOS_ARQUIVO = [
  { value: 'contrato', label: 'Contrato', icon: FileText, color: 'blue' },
  { value: 'documento', label: 'Documento', icon: File, color: 'gray' },
  { value: 'foto', label: 'Foto', icon: Image, color: 'green' },
  { value: 'medicao', label: 'Medição', icon: FileText, color: 'purple' },
  { value: 'projeto', label: 'Projeto', icon: FileCode, color: 'orange' },
  { value: 'orcamento', label: 'Orçamento', icon: FileSpreadsheet, color: 'yellow' },
  { value: 'nota_fiscal', label: 'Nota Fiscal', icon: FileText, color: 'red' },
  { value: 'outro', label: 'Outro', icon: FileQuestion, color: 'gray' },
] as const;

export const ENTIDADES = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'lead', label: 'Lead' },
  { value: 'visita', label: 'Visita' },
  { value: 'geral', label: 'Geral' },
] as const;

export const MAX_FILES_PER_UPLOAD = 10;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

export function validateFile(file: File): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido: ${file.type}`,
    };
  }

  if (file.name.length > 255) {
    return {
      valid: false,
      error: 'Nome do arquivo muito longo (máx 255 caracteres)',
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'pdf':
      return { icon: FileText, color: 'text-red-500' };
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return { icon: Image, color: 'text-green-500' };
    case 'doc':
    case 'docx':
      return { icon: FileCode, color: 'text-blue-500' };
    case 'xls':
    case 'xlsx':
      return { icon: FileSpreadsheet, color: 'text-emerald-600' };
    case 'zip':
    case 'rar':
      return { icon: Archive, color: 'text-yellow-500' };
    default:
      return { icon: File, color: 'text-muted-foreground' };
  }
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
}

export function isPdfFile(fileName: string): boolean {
  return getFileExtension(fileName) === 'pdf';
}

export function sanitizeFileName(fileName: string): string {
  // Remove caracteres especiais perigosos
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getFileSizeWarning(bytes: number): string | null {
  const GB = 1024 * 1024 * 1024;
  
  if (bytes > 5 * GB) {
    return "⚠️ Arquivo muito grande (>5GB) - considere usar uma conexão estável";
  }
  
  if (bytes > 1 * GB) {
    return "⚠️ Arquivo grande - o upload pode demorar dependendo da sua conexão";
  }
  
  return null;
}

export function generateStoragePath(
  userId: string,
  entidade: string,
  entidadeId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFileName(fileName);
  return `${userId}/${entidade}/${entidadeId}/${timestamp}_${sanitized}`;
}
