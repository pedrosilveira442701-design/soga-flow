# WhatsApp → Leads (Fase 1) — Design

**Data:** 2026-06-04
**Projeto:** soga-flow (ERP Só Garagens)
**Status:** Aprovado para implementação

## Problema

100% dos clientes da Só Garagens chegam pelo WhatsApp da empresa. O atendimento é
manual e só os contatos "interessantes" são anotados como lead. Isso distorce os
números do funil — não dá pra saber se o negócio vai bem porque a base de leads é
um recorte enviesado (só os bons), sem denominador real.

## Objetivo (Fase 1)

Gerar leads **automaticamente** a partir do WhatsApp do negócio, capturando:
- **Nome** (pushname do WhatsApp + nome que a pessoa informa na conversa)
- **Telefone**
- **Horário** do primeiro contato
- **Canal** de aquisição (onde a pessoa achou a empresa — Google, indicação, placa
  de obra, etc.), extraído da conversa pela IA (o dono sempre pergunta isso)

Mais uma **varredura única na primeira conexão**: importar os contatos/conversas que
o WhatsApp sincronizar para o device, filtrando `>= 2025-09-01` e deduplicando contra
quem já está cadastrado como cliente.

## Decisões-chave (aprovadas)

1. **Triagem por IA, não captura crua.** Todo contato novo entra, mas a IA lê as
   primeiras mensagens e classifica `potencial` vs `ruido` (entregador/spam/fornecedor).
   O dono revisa só a fila de potenciais.
2. **Evolution API (não-oficial), companion device.** O número do negócio é vinculado
   por QR como dispositivo adicional (igual WhatsApp Web). O celular segue atendendo
   normalmente. **Fase 1 é só leitura** (nunca envia), mas a infra já fica preparada
   para envio em fase futura.
3. **Captura-primeiro.** Todo número novo vira lead `novo` imediatamente, antes da IA.
   Se a triagem falhar, o lead fica `pendente` para revisão manual. Nenhum número se perde.

## Limitação conhecida (varredura histórica)

Ao vincular um device companheiro novo, o WhatsApp **não garante sincronizar 100% do
histórico** — entrega só a janela que o celular primário decidir sincronizar. A varredura
busca tudo que estiver disponível, filtra `>= 2025-09-01` e deduplica. O que a Meta não
sincronizar, não há como forçar. Limitação de plataforma, não do código.

## Arquitetura

```
WhatsApp do negócio (app normal)
        │ QR (companion, read-only)
        ▼
Evolution API — instância "sogaragens"
        │ webhook: messages.upsert / connection.update
        ▼
Edge Function: whatsapp-webhook (Supabase)
   • grava mensagem bruta (whatsapp_mensagens)
   • upsert contato → clientes (dedup por telefone)
   • cria lead "novo" (captura-primeiro), triagem_status='pendente'
   • agenda triagem (debounce ~90s)
        ▼
Edge Function: whatsapp-triagem (Supabase)
   • IA lê primeiras mensagens → {e_lead_real, canal, nome, motivo}
   • atualiza lead: triagem_status, origem_descricao(canal), nome
        ▼
ERP /leads → aba "Fila de Triagem" (Potenciais · Pendentes · Ruído)
```

Componente extra (one-shot): **Edge Function `whatsapp-backfill`**, disparada na primeira
conexão (`connection.update` → open), que chama `findChats`/`findMessages` no Evolution,
filtra por data e roda o mesmo pipeline de ingestão+triagem.

## Componentes (isolados e testáveis)

| # | Componente | Responsabilidade | Stack |
|---|-----------|------------------|-------|
| A | Instância Evolution `sogaragens` | Vincula número (read-only), emite webhooks | Evolution (infra existente) |
| B | `whatsapp-webhook` | Ingestão em tempo real: grava msg, upsert contato, cria lead, agenda triagem | Edge Function (Deno) |
| C | `whatsapp-triagem` | Classificação IA + extração de canal/nome | Edge Function (Deno) |
| D | `whatsapp-backfill` | Varredura única pós-conexão (≥ 2025-09-01, dedup) | Edge Function (Deno) |
| E | Migration | Schema novo + RLS | SQL |
| F | UI Fila de Triagem | Aba em /leads + status de conexão + ações | React/TS |

## Schema

### Nova tabela `whatsapp_mensagens`
```
id            UUID PK
jid           TEXT        -- telefone normalizado (E.164 sem +)
push_name     TEXT
from_me       BOOLEAN
texto         TEXT
message_id    TEXT UNIQUE -- idempotência (evita reprocessar webhook duplicado)
message_ts    TIMESTAMPTZ -- horário real da mensagem
lead_id       UUID FK leads(id)
user_id       UUID        -- dono (Fase 1: único)
created_at    TIMESTAMPTZ DEFAULT now()
```

### Nova tabela `whatsapp_conexao` (estado da instância)
```
id            UUID PK
user_id       UUID
instancia     TEXT        -- "sogaragens"
status        TEXT        -- 'desconectado' | 'conectando' | 'conectado'
numero        TEXT
backfill_done BOOLEAN DEFAULT false   -- garante varredura única
last_event_at TIMESTAMPTZ
created_at    TIMESTAMPTZ DEFAULT now()
```

### Colunas novas em `leads`
```
origem            -> set 'whatsapp'        (campo já existe)
origem_descricao  TEXT   -- canal de aquisição detectado pela IA
triagem_status    TEXT DEFAULT 'pendente'  -- 'pendente'|'potencial'|'ruido'
triagem_motivo    TEXT
whatsapp_jid      TEXT
primeira_mensagem TEXT
primeira_interacao_at TIMESTAMPTZ
```

Reuso de `clientes` (já tem `nome`, `telefone`) — dedup por `telefone` + `user_id`,
seguindo o padrão da função `find/create contato` que já existe no sistema.

### RLS
Todas as tabelas novas: `user_id = auth.uid()` para SELECT/UPDATE no app. As edge
functions escrevem com **service role** (bypassa RLS), atribuindo o `user_id` do dono.

## Triagem por IA

Entrada: primeiras N mensagens (inbound + as perguntas do dono) da conversa.
Saída (JSON estruturado):
```json
{
  "e_lead_real": true,
  "canal": "Google",
  "nome": "João Silva",
  "motivo": "Pedindo orçamento de piso epóxi para garagem"
}
```
- Modelo: Groq `llama-3.3-70b-versatile` (rápido/barato, já usado no stack).
- Falha de IA ⇒ lead permanece `pendente` (revisão manual). Nunca bloqueia captura.
- Debounce ~90s após primeira mensagem para colher a resposta do canal antes de classificar.

## UI (/leads)

Aba **Fila de Triagem** com 3 listas:
- **Potenciais** — IA marcou como lead real; dono revisa e **Promove** (entra no funil) ou **Descarta**.
- **Pendentes** — IA ainda processando ou falhou; revisão manual.
- **Ruído** — descartados pela IA; recuperáveis (Promover).

Cada card: nome, telefone, horário, canal, trecho da conversa. Indicador de status da
conexão WhatsApp (conectado/desconectado) no topo da página.

## Fora de escopo (fases futuras)

- IA respondendo/disparando mensagens (infra pronta, desligada).
- Multi-atendente (Fase 1 assume 1 dono / 1 `user_id`).
- Sincronização de histórico além do que o WhatsApp entrega ao device.

## Handoff de deploy (o que exige credenciais/ação do dono)

Estas etapas NÃO podem ser feitas pelo agente com o acesso atual:
1. **Deploy Supabase** (migration + edge functions) — precisa de access token desta org
   ou DB password/service-role (estão em `crm-so-garagens.env` na EC2).
2. **Servidor Evolution** — provisionar instância `sogaragens` (reusar infra do
   Medical Concierge ou subir dedicada).
3. **Vincular WhatsApp** — ler o QR no celular do dono (ação física, intransferível).
4. **Secrets das edge functions** — `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`,
   `GROQ_API_KEY`, `OWNER_USER_ID`.
