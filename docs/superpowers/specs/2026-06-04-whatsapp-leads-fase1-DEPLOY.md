# Deploy — WhatsApp → Leads (Fase 1)

Runbook de go-live. Os passos exigem credenciais/ação que o agente não tem
(token Supabase desta org, servidor Evolution, e o QR no celular do dono).

## 0. Pré-requisitos / segredos

| Segredo | Onde usar | De onde vem |
|---------|-----------|-------------|
| `SUPABASE_ACCESS_TOKEN` (desta org) | deploy CLI | painel Supabase → Account → Access Tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | secret das functions | painel Supabase → Project Settings → API |
| `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` | provisionar + functions | servidor Evolution (reusar o do Medical Concierge ou subir dedicado) |
| `GROQ_API_KEY` | secret da function triagem | console.groq.com |
| `OWNER_USER_ID` | secret das functions | `auth.users` do dono no Supabase (UUID do login do ERP) |

## 1. Migration (cria schema)

```bash
cd soga-flow
export SUPABASE_ACCESS_TOKEN=<token-desta-org>
supabase link --project-ref jtfvqbgqenrsmsmmbydu
supabase db push        # aplica 20260604205436_whatsapp_leads_fase1.sql
```

## 2. Secrets das edge functions

```bash
supabase secrets set \
  EVOLUTION_API_URL="https://evo.seuservidor.com" \
  EVOLUTION_API_KEY="<apikey>" \
  EVOLUTION_INSTANCE="sogaragens" \
  GROQ_API_KEY="<groq>" \
  OWNER_USER_ID="<uuid-do-dono>"
# SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetados pelo runtime.
```

## 3. Deploy das functions

```bash
supabase functions deploy whatsapp-webhook  --no-verify-jwt   # webhook público p/ Evolution
supabase functions deploy whatsapp-triagem
supabase functions deploy whatsapp-backfill
```

> `--no-verify-jwt` só no webhook (o Evolution não manda JWT). As outras são
> chamadas internamente com o service role.

## 4. Provisionar Evolution + vincular número

```bash
cd scripts/whatsapp
export EVOLUTION_API_URL=... EVOLUTION_API_KEY=... SUPABASE_REF=jtfvqbgqenrsmsmmbydu
./provision-evolution.sh create     # cria instância + webhook
./provision-evolution.sh qr         # >>> LER O QR no celular do dono <<<
./provision-evolution.sh status     # confirmar "open"
```

Ao conectar (`CONNECTION_UPDATE → open`), o webhook dispara **automaticamente**
a varredura histórica (`whatsapp-backfill`) uma única vez.

## 5. Validação

1. Mandar uma mensagem de teste de outro número para o WhatsApp do negócio.
2. Conferir no Supabase: linha em `whatsapp_mensagens`, contato em `contatos`
   com `origem='whatsapp'`, e em segundos `triagem_status` vira `potencial`/`ruido`.
3. No ERP `/leads` → botão **Triagem WhatsApp** → o contato aparece em Potenciais.
4. **Promover a Lead** → entra no funil normal.

## Rollback

- Functions: `supabase functions delete whatsapp-webhook whatsapp-triagem whatsapp-backfill`
- Evolution: `DELETE {BASE}/instance/delete/sogaragens`
- Schema: as colunas/tabelas são aditivas e não afetam o ERP existente; podem ficar.

## Observações de risco

- **Fase 1 não envia mensagens** — só lê. Risco de bloqueio do número ~nulo.
- **Varredura histórica** importa só o que o WhatsApp sincronizar ao device novo
  (limitação da Meta), filtrando `>= 2025-09-01` e deduplicando contra `clientes`.
- **OWNER_USER_ID** assume 1 dono (multi-atendente é fase futura).
