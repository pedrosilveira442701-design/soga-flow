#!/usr/bin/env python3
# Varredura histórica (roda na EC2, sem timeout). Importa conversas do WhatsApp
# >= 2025-09-01 como contatos 'pendente'. Resolve @lid via remoteJidAlt — busca em
# findMessages E no lastMessage do próprio chat (recupera chats sem histórico sincronizado).
# Deduplica contra clientes/contatos, salva a conversa e dispara a triagem.
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
def skip_jid(jid):
    return any(x in jid for x in ["@g.us", "@broadcast", "@newsletter"])

def msg_text(m):
    m = m or {}
    t = m.get("conversation") or (m.get("extendedTextMessage") or {}).get("text")
    if t: return t
    if m.get("imageMessage"): return "[imagem] " + ((m["imageMessage"] or {}).get("caption") or "")
    if m.get("videoMessage"): return "[vídeo] " + ((m["videoMessage"] or {}).get("caption") or "")
    if m.get("documentMessage"): return "[documento] " + ((m["documentMessage"] or {}).get("caption") or "")
    if m.get("audioMessage"): return "[áudio]"
    return None

def alt_de(msgobj):
    return (msgobj or {}).get("key", {}).get("remoteJidAlt", "")

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

imp = skip_cli = skip_dup = skip_semmsg = skip_nophone = 0
novos_ids = []
for n, ch in enumerate(chats):
    jid = ch.get("remoteJid") or ch.get("id") or ch.get("jid") or ""
    if not jid or skip_jid(jid): continue
    lastmsg = ch.get("lastMessage") or {}

    try:
        raw = evo(f"/chat/findMessages/{INSTANCE}", {"where": {"key": {"remoteJid": jid}}})
    except Exception:
        raw = {}
    recs = raw.get("messages", {}).get("records", []) if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])

    # Resolve número real: jid -> lastMessage.remoteJidAlt -> recs remoteJidAlt
    real = digits(jid.split("@")[0]) if is_real(jid) else ""
    if not real and is_real(alt_de(lastmsg)): real = digits(alt_de(lastmsg).split("@")[0])
    if not real:
        for d in recs:
            if is_real(alt_de(d)): real = digits(alt_de(d).split("@")[0]); break
    if not real:
        skip_nophone += 1; continue

    dkey = k8(real)
    if dkey in cli_set: skip_cli += 1; continue
    if dkey in cont_set: skip_dup += 1; continue

    # Mensagens desde o cutoff; se findMessages vier vazio, usa o lastMessage do chat.
    msgs = []
    for d in recs:
        ts = d.get("messageTimestamp"); ts = ts if isinstance(ts, int) else int(ts or 0)
        if ts * 1000 < CUTOFF_MS: continue
        txt = msg_text(d.get("message"))
        if txt: msgs.append((ts, bool(d.get("key", {}).get("fromMe")), txt, d.get("pushName")))
    if not msgs and lastmsg:
        ts = lastmsg.get("messageTimestamp"); ts = ts if isinstance(ts, int) else int(ts or 0)
        txt = msg_text(lastmsg.get("message"))
        if ts * 1000 >= CUTOFF_MS and txt:
            msgs.append((ts, bool(lastmsg.get("key", {}).get("fromMe")), txt, lastmsg.get("pushName")))
    if not msgs:
        skip_semmsg += 1; continue

    msgs.sort(key=lambda x: x[0])
    primeira = next((m for m in msgs if not m[1]), msgs[0])  # 1ª recebida, ou a 1ª
    nome = ch.get("pushName") or next((m[3] for m in msgs if not m[1] and m[3] and m[3] != "Você"), None)
    conversa = "\n".join(f"{'EMPRESA' if fm else 'CLIENTE'}: {t}" for _, fm, t, _ in msgs)[:3000]

    c = supa("POST", "contatos", body={
        "user_id": OWNER, "telefone": real, "nome": nome, "data_hora": iso(primeira[0]),
        "origem": "whatsapp", "observacoes": primeira[2], "texto_conversa": conversa,
        "whatsapp_jid": jid, "triagem_status": "pendente"})
    if not c: continue
    cid = c[0]["id"] if isinstance(c, list) else c["id"]
    cont_set.add(dkey); novos_ids.append(cid); imp += 1
    if imp % 25 == 0: print(f"  …{imp} importados (chat {n+1}/{len(chats)})")

print(json.dumps({"importados": imp, "pulados_cliente": skip_cli, "pulados_dup": skip_dup,
                  "pulados_sem_msg": skip_semmsg, "pulados_sem_numero": skip_nophone}))

print(f"triando {len(novos_ids)}…")
for i, cid in enumerate(novos_ids):
    triagem(cid)
    if i % 25 == 0: print(f"  triados {i}/{len(novos_ids)}")
    time.sleep(1.1)

supa("PATCH", "whatsapp_conexao", body={"backfill_done": True},
     params=f"?user_id=eq.{OWNER}&instancia=eq.{INSTANCE}", prefer="return=minimal")
print("ok")
