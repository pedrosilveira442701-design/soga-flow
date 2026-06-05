#!/usr/bin/env bash
# ============================================================================
# Provisiona a instância Evolution "sogaragens" (Fase 1: só leitura) e aponta
# o webhook para a edge function whatsapp-webhook do Supabase.
#
# Pré-requisitos (exporte antes de rodar):
#   EVOLUTION_API_URL   ex: https://evo.seuservidor.com
#   EVOLUTION_API_KEY   apikey global do Evolution
#   SUPABASE_REF        ex: jtfvqbgqenrsmsmmbydu
#   INSTANCE            opcional, default "sogaragens"
#
# Uso:
#   ./provision-evolution.sh create   # cria instância + webhook
#   ./provision-evolution.sh qr       # mostra o QR para vincular o número
#   ./provision-evolution.sh status   # estado da conexão
# ============================================================================
set -euo pipefail

: "${EVOLUTION_API_URL:?defina EVOLUTION_API_URL}"
: "${EVOLUTION_API_KEY:?defina EVOLUTION_API_KEY}"
: "${SUPABASE_REF:?defina SUPABASE_REF}"
INSTANCE="${INSTANCE:-sogaragens}"
BASE="${EVOLUTION_API_URL%/}"
WEBHOOK="https://${SUPABASE_REF}.supabase.co/functions/v1/whatsapp-webhook"

hdr=(-H "Content-Type: application/json" -H "apikey: ${EVOLUTION_API_KEY}")

case "${1:-}" in
  create)
    echo "→ Criando instância '${INSTANCE}' (somente leitura)…"
    # readMessages=true permite ler; não enviamos nada na Fase 1.
    curl -sS "${hdr[@]}" -X POST "${BASE}/instance/create" -d "$(cat <<JSON
{
  "instanceName": "${INSTANCE}",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS",
  "webhook": {
    "url": "${WEBHOOK}",
    "byEvents": false,
    "base64": false,
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  }
}
JSON
)" | python3 -m json.tool || true
    echo "→ Rode '$0 qr' e leia o QR no WhatsApp do negócio (Aparelhos conectados)."
    ;;

  qr)
    echo "→ QR / pairing da instância '${INSTANCE}':"
    curl -sS "${hdr[@]}" "${BASE}/instance/connect/${INSTANCE}" | python3 -m json.tool || true
    ;;

  status)
    curl -sS "${hdr[@]}" "${BASE}/instance/connectionState/${INSTANCE}" | python3 -m json.tool || true
    ;;

  set-webhook)
    echo "→ (Re)configurando webhook → ${WEBHOOK}"
    curl -sS "${hdr[@]}" -X POST "${BASE}/webhook/set/${INSTANCE}" -d "$(cat <<JSON
{
  "webhook": {
    "enabled": true,
    "url": "${WEBHOOK}",
    "byEvents": false,
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  }
}
JSON
)" | python3 -m json.tool || true
    ;;

  *)
    echo "uso: $0 {create|qr|status|set-webhook}"
    exit 1
    ;;
esac
