#!/usr/bin/env bash
# ============================================================================
# Deploy do ERP Só Garagens na EC2 BerithOS (independente do Lovable).
# Builda o frontend e publica em https://sogaragens.52-67-66-181.sslip.io
# (Caddy serve /home/ubuntu/sogaragens-erp/dist com fallback SPA.)
#
# Uso: ./deploy-ec2.sh
# Requer: ssh host "berith-ec2" configurado (~/.ssh/config).
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

echo "→ build de produção…"
npm run build

echo "→ enviando dist/ para a EC2…"
ssh berith-ec2 'mkdir -p /home/ubuntu/sogaragens-erp/dist'
rsync -az --delete -e ssh dist/ berith-ec2:/home/ubuntu/sogaragens-erp/dist/
ssh berith-ec2 'chmod -R a+rX /home/ubuntu/sogaragens-erp'

echo "→ publicado: https://sogaragens.52-67-66-181.sslip.io/"
