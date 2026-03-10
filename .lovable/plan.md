

# Cron Jobs Causando Lentidão no Supabase

## Diagnóstico

Encontrei **5 cron jobs ativos**, dos quais **3 rodam a cada minuto** e **2 chamam funções que nem existem**:

| Job | Schedule | Função chamada | Status |
|-----|----------|----------------|--------|
| #1 | `*/5 * * * *` | `anotacoes-reminders-email` | **Fantasma** - função não existe |
| #3 | `*/5 * * * *` | `notificacoes-email` | **Fantasma** - função não existe |
| #9 | `* * * * *` | `send-daily-report` | OK, mas roda **a cada minuto** |
| #10 | `* * * * *` | `send-management-report` | OK, mas roda **a cada minuto** |
| #11 | `* * * * *` | `send-anotacao-reminders` | OK, mas roda **a cada minuto** |

**Impacto**: A cada minuto, 3 edge functions são invocadas + 2 chamadas falham para funções inexistentes. Isso gera **5 requests HTTP/minuto** (300/hora) contra o Supabase, sobrecarregando o banco com conexões `pg_net` e acumulando registros em `cron.job_run_details`. Os logs confirmam execuções simultâneas duplicadas do `send-management-report`.

## Plano de Correção

### 1. Remover cron jobs fantasma (jobs #1 e #3)
Chamam funções que não existem (`anotacoes-reminders-email` e `notificacoes-email`). Geram erros a cada 5 minutos.

```sql
SELECT cron.unschedule(1);
SELECT cron.unschedule(3);
```

### 2. Reduzir frequência dos cron jobs restantes
Os relatórios diário e de gestão não precisam rodar a cada minuto. A cada 15 minutos é suficiente (a lógica interna já verifica o horário do usuário):

```sql
SELECT cron.unschedule(9);
SELECT cron.unschedule(10);
SELECT cron.unschedule(11);

-- Recriar com frequência adequada
SELECT cron.schedule('send-daily-report', '*/15 * * * *', $$...$$);
SELECT cron.schedule('send-management-report', '*/15 * * * *', $$...$$);
SELECT cron.schedule('send-anotacao-reminders', '*/5 * * * *', $$...$$);
```

### 3. Limpar histórico de execuções acumuladas
A tabela `cron.job_run_details` acumula milhares de registros que também pesam:

```sql
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';
```

## Resumo do impacto

- **Antes**: ~5 requests HTTP/minuto (300/hora), 2 falhando sempre
- **Depois**: ~1 request a cada 5 min + 2 a cada 15 min (~16/hora)
- Redução de **~95%** na carga de cron sobre o Supabase

## Arquivos alterados

Nenhum arquivo de código precisa ser alterado. Todas as mudanças são via SQL no banco.

