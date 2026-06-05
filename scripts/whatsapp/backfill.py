#!/usr/bin/env python3
# Varredura histórica (roda na EC2, sem timeout). Importa conversas do WhatsApp
# >= 2025-09-01 como contatos 'pendente'. Resolve @lid via remoteJidAlt (número real),
# deduplica contra clientes/contatos, salva a conversa COMPLETA e dispara a triagem.
import json, re, os, time, datetime as dt, urllib.request, urllib.error

EVO_URL  = os.environ["EVO_URL"]; EVO_KEY = os.environ["EVO_KEY"]
INSTANCE = os.environ.get("INSTANCE", "sogaragens")
SUPA_URL = os.environ["SUPA_URL"].rstrip("/"); SROLE = os.environ["SROLE"]
OWNER    = os.environ["OWNER"]
CUTOFF_MS = int(dt.datetime(2025, 9, 1, tzinfo=dt.timezone.utc).timestamp() * 1000)
TRIAGEM_URL = SUPA_URL + "/functions/v1/whatsapp-triagem"

def digits(s): return re.sub(r"\D", "", s or "")
def iso(ts):   return dt.datetime.fromtimestamp(ts, dt.timezone.utc).isoformat()
def k8(s):     return digits(s)[-8:]
def is_real(jid):
    if "@" in jid and not jid.endswith("@s.whatsapp.net"): return False
    ph = digits(jid.split("@")[0]); return ph.startswith("55") and len(ph) in (12, 13)
def skip_jid(jid):  # grupos/broadcast/newsletter nunca viram lead
    return any(x in jid for x in ["@g.us", "@broadcast", "@newsletter"])

def evo(path, body):
    req = urllib.request.Request(EVO_URL + path, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "apikey": EVO_KEY}, method="POST")
    return json.load(urllib.request.urlopen(req, timeout=90))

def supa(method, path, body=None, params="", prefer="return=representation"):
    req = urllib.request.Request(SUPA_URL + "/rest/v1/" + path + params,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"apikey": SROLE, "Authorization": "Bearer " + SROLE,
                 "Content-Type": "application/json", "Prefer": prefer}, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=40); t = r.read()
        return json.loads(t) if t else []
    except urllib.error.HTTPError as e:
        if e.code not in (409,): print("  supa", method, e.code, e.read()[:120].decode("utf-8", "ignore"))
        return None

def triagem(cid):
    try:
        req = urllib.request.Request(TRIAGEM_URL, data=json.dumps({"contato_id": cid}).encode(),
            headers={"Authorization": "Bearer " + SROLE, "Content-Type": "application/json"}, method="POST")
        return json.load(urllib.request.urlopen(req, timeout=60)).get("status")
    except Exception as e:
        return f"err:{e}"

clientes = supa("GET", "clientes", params=f"?user_id=eq.{OWNER}&select=telefone") or []
cli_set = set(k8(c.get("telefone")) for c in clientes if digits(c.get("telefone")))
conts = supa("GET", "contatos", params=f"?user_id=eq.{OWNER}&select=telefone") or []
cont_set = set(k8(c.get("telefone")) for c in conts if digits(c.get("telefone")))
print(f"clientes={len(cli_set)} contatos_existentes={len(cont_set)}")

chats = evo(f"/chat/findChats/{INSTANCE}", {})
if isinstance(chats, dict): chats = chats.get("chats", [])
print(f"chats sincronizados: {len(chats)}")

imp = skip_cli = skip_dup = skip_noinbound = skip_nophone = 0
novos_ids = []
for n, ch in enumerate(chats):
    jid = ch.get("id") or ch.get("remoteJid") or ch.get("jid") or ""
    if not jid or skip_jid(jid): continue
    try:
        raw = evo(f"/chat/findMessages/{INSTANCE}", {"where": {"key": {"remoteJid": jid}}})
    except Exception:
        continue
    recs = raw.get("messages", {}).get("records", []) if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])

    # Resolve o número real: do próprio jid, ou do remoteJidAlt das mensagens (@lid).
    real = digits(jid.split("@")[0]) if is_real(jid) else ""
    if not real:
        for d in recs:
            alt = d.get("key", {}).get("remoteJidAlt", "")
            if is_real(alt): real = digits(alt.split("@")[0]); break
    if not real:
        skip_nophone += 1; continue

    dkey = k8(real)
    if dkey in cli_set: skip_cli += 1; continue
    if dkey in cont_set: skip_dup += 1; continue

    msgs = []
    for d in recs:
        ts = d.get("messageTimestamp"); ts = ts if isinstance(ts, int) else int(ts or 0)
        if ts * 1000 < CUTOFF_MS: continue
        m = d.get("message") or {}
        txt = m.get("conversation") or (m.get("extendedTextMessage") or {}).get("text")
        if not txt: continue
        msgs.append((ts, bool(d.get("key", {}).get("fromMe")), txt, d.get("pushName")))
    if not any(not fm for _, fm, _, _ in msgs):  # precisa de msg recebida recente
        skip_noinbound += 1; continue
    msgs.sort(key=lambda x: x[0])
    first_in = next((m for m in msgs if not m[1]), msgs[0])
    conversa = "\n".join(f"{'EMPRESA' if fm else 'CLIENTE'}: {t}" for _, fm, t, _ in msgs)[:3000]

    c = supa("POST", "contatos", body={
        "user_id": OWNER, "telefone": real, "nome": first_in[3], "data_hora": iso(first_in[0]),
        "origem": "whatsapp", "observacoes": first_in[2], "texto_conversa": conversa,
        "whatsapp_jid": jid, "triagem_status": "pendente"})
    if not c: continue
    cid = c[0]["id"] if isinstance(c, list) else c["id"]
    cont_set.add(dkey); novos_ids.append(cid); imp += 1
    if imp % 25 == 0: print(f"  …{imp} importados (chat {n+1}/{len(chats)})")

print(json.dumps({"importados": imp, "pulados_cliente": skip_cli, "pulados_dup": skip_dup,
                  "pulados_sem_inbound": skip_noinbound, "pulados_sem_numero": skip_nophone}))

print(f"triando {len(novos_ids)}…")
for i, cid in enumerate(novos_ids):
    st = triagem(cid)
    if i % 20 == 0: print(f"  triados {i}/{len(novos_ids)}")
    time.sleep(1.2)

supa("PATCH", "whatsapp_conexao", body={"backfill_done": True},
     params=f"?user_id=eq.{OWNER}&instancia=eq.{INSTANCE}", prefer="return=minimal")
print("ok")
