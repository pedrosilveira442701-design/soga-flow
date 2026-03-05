

# Suporte a Múltiplos E-mails de Destinatário nos Relatórios

## Problema

Atualmente o campo `email_customizado` na tabela `notificacao_preferencias` é um `text` simples, armazenando apenas um e-mail. O usuário quer enviar os relatórios (Diário e Gestão) para mais de um destinatário.

## Abordagem

Transformar o campo `email_customizado` de texto único para texto com múltiplos e-mails separados por vírgula. Não precisa alterar o tipo da coluna no banco (continua `text`), basta armazenar como `"email1@x.com, email2@x.com"` e fazer o split nas Edge Functions.

## Mudanças

### 1. UI em `NotificationSettings.tsx`

- Substituir o input único por um campo que permita digitar múltiplos e-mails separados por vírgula
- Adicionar texto explicativo: "Separe múltiplos e-mails com vírgula"
- Validar cada e-mail antes de salvar
- Mostrar badge/chip visual para cada e-mail adicionado (UX melhor)

### 2. Edge Function `send-daily-report/index.ts`

- Na linha que define `userEmail`, fazer split por vírgula do `email_customizado`
- Passar array de e-mails no campo `to` do Resend (já aceita array nativamente)

### 3. Edge Function `send-management-report/index.ts`

- Mesma alteração: split do `email_customizado` por vírgula e enviar para múltiplos destinatários

### 4. Hook `useNotificationPreferences.tsx`

- Sem alteração de lógica, o campo continua sendo `text`

## Detalhes Técnicos

- Resend API aceita `to: ["email1", "email2"]` nativamente
- O campo `email_customizado` continua `text` no banco, armazenando e-mails separados por vírgula
- Nenhuma migration necessária

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/NotificationSettings.tsx` | UI multi-email com chips e validação |
| `supabase/functions/send-daily-report/index.ts` | Split e-mails e enviar para array |
| `supabase/functions/send-management-report/index.ts` | Split e-mails e enviar para array |

