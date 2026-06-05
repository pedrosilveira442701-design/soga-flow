#!/usr/bin/env python3
# Varredura histórica única (roda na EC2, sem limite de tempo da edge function).
# Importa conversas do WhatsApp >= 2025-09-01, deduplicando contra clientes/contatos,
# como contatos 'pendente' na fila de triagem. Marca backfill_done ao final.
import json, re, os, sys, datetime as dt, urllib.request, urllib.error

EVO_URL  = os.environ["EVO_URL"]
EVO_KEY  = os.environ["EVO_KEY"]
INSTANCE = os.environ.get("INSTANCE", "sogaragens")
SUPA_URL = os.environ["SUPA_URL"].rstrip("/")
SROLE    = os.environ["SROLE"]
OWNER    = os.environ["OWNER"]
CUTOFF_MS = int(dt.datetime(2025, 9, 1, tzinfo=dt.timezone.utc).timestamp() * 1000)

def digits(s): return re.sub(r"\D", "", s or "")
def iso(ts):   return dt.datetime.fromtimestamp(ts, dt.timezone.utc).isoformat()
def k8(s):     return digits(s)[-8:]   # chave de dedup: 8 últimos dígitos (ignora 55/DDD/9)
def is_real_number(jid):
    # Só números reais do WhatsApp (descarta @lid, @g.us, @broadcast, @newsletter).
    if "@" in jid and not jid.endswith("@s.whatsapp.net"):
        return False
    ph = digits(jid.split("@")[0])
    return ph.startswith("55") and len(ph) in (12, 13)

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
        r = urllib.request.urlopen(req, timeout=40)
        t = r.read()
        return json.loads(t) if t else []
    except urllib.error.HTTPError as e:
        if e.code not in (409,):
            print("  supa", method, path, e.code, e.read()[:160].decode(errors="ignore"))
        return None

# Dedup sets
clientes = supa("GET", "clientes", params=f"?user_id=eq.{OWNER}&select=telefone") or []
cli_set = set(k8(c.get("telefone")) for c in clientes if digits(c.get("telefone")))
conts = supa("GET", "contatos", params=f"?user_id=eq.{OWNER}&select=telefone") or []
cont_set = set(k8(c.get("telefone")) for c in conts if digits(c.get("telefone")))
print(f"clientes={len(cli_set)} contatos_existentes={len(cont_set)}")

chats = evo(f"/chat/findChats/{INSTANCE}", {})
if isinstance(chats, dict): chats = chats.get("chats", [])
print(f"chats sincronizados: {len(chats)}")

imp = skip_cli = skip_dup = skip_noinbound = 0
for n, ch in enumerate(chats):
    jid = ch.get("id") or ch.get("remoteJid") or ch.get("jid") or ""
    if not jid or not is_real_number(jid): continue   # descarta grupos, @lid, lixo
    ph = digits(jid.split("@")[0])
    dkey = k8(ph)
    if dkey in cli_set: skip_cli += 1; continue
    if dkey in cont_set: skip_dup += 1; continue
    try:
        raw = evo(f"/chat/findMessages/{INSTANCE}", {"where": {"key": {"remoteJid": jid}}})
    except Exception:
        continue
    recs = raw.get("messages", {}).get("records", []) if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])
    msgs = []
    for d in recs:
        key = d.get("key", {})
        ts = d.get("messageTimestamp"); ts = ts if isinstance(ts, int) else int(ts or 0)
        if ts * 1000 < CUTOFF_MS: continue
        m = d.get("message") or {}
        txt = m.get("conversation") or (m.get("extendedTextMessage") or {}).get("text")
        msgs.append({"fromMe": bool(key.get("fromMe")), "txt": txt, "ts": ts,
                     "id": key.get("id") or f"{jid}-{ts}", "push": d.get("pushName")})
    inbound = [m for m in msgs if not m["fromMe"]]
    if not inbound:
        skip_noinbound += 1; continue
    first = min(inbound, key=lambda m: m["ts"])
    c = supa("POST", "contatos", body={
        "user_id": OWNER, "telefone": ph, "nome": first["push"], "data_hora": iso(first["ts"]),
        "origem": "whatsapp", "observacoes": first["txt"], "texto_conversa": first["txt"],
        "whatsapp_jid": ph, "whatsapp_msg_id": first["id"], "triagem_status": "pendente"})
    if not c: continue
    cid = c[0]["id"] if isinstance(c, list) else c["id"]
    cont_set.add(dkey)
    rows = [{"user_id": OWNER, "jid": ph, "push_name": m["push"], "from_me": m["fromMe"],
             "texto": m["txt"], "message_id": m["id"], "message_ts": iso(m["ts"]), "contato_id": cid} for m in msgs]
    if rows:
        supa("POST", "whatsapp_mensagens", body=rows, params="?on_conflict=user_id,message_id",
             prefer="resolution=ignore-duplicates,return=minimal")
    imp += 1
    if imp % 25 == 0: print(f"  …{imp} importados (chat {n+1}/{len(chats)})")

supa("PATCH", "whatsapp_conexao", body={"backfill_done": True},
     params=f"?user_id=eq.{OWNER}&instancia=eq.{INSTANCE}", prefer="return=minimal")
print(json.dumps({"importados": imp, "pulados_cliente": skip_cli,
                  "pulados_dup": skip_dup, "pulados_sem_inbound_recente": skip_noinbound}))
