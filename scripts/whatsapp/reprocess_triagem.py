#!/usr/bin/env python3
# Re-busca a conversa COMPLETA de cada contato whatsapp no Evolution, salva em
# texto_conversa e re-dispara a triagem (com espaçamento p/ não throttlar o Bedrock).
import json, re, os, time, datetime as dt, urllib.request, urllib.error

EVO_URL  = os.environ["EVO_URL"]; EVO_KEY = os.environ["EVO_KEY"]
INSTANCE = os.environ.get("INSTANCE", "sogaragens")
SUPA_URL = os.environ["SUPA_URL"].rstrip("/"); SROLE = os.environ["SROLE"]
TRIAGEM_URL = SUPA_URL.replace(".supabase.co", ".supabase.co") + "/functions/v1/whatsapp-triagem"

def evo(path, body):
    req = urllib.request.Request(EVO_URL + path, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "apikey": EVO_KEY}, method="POST")
    return json.load(urllib.request.urlopen(req, timeout=60))

def supa(method, path, body=None, params="", prefer="return=representation"):
    req = urllib.request.Request(SUPA_URL + "/rest/v1/" + path + params,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"apikey": SROLE, "Authorization": "Bearer " + SROLE,
                 "Content-Type": "application/json", "Prefer": prefer}, method=method)
    r = urllib.request.urlopen(req, timeout=40); t = r.read()
    return json.loads(t) if t else []

def triagem(cid):
    req = urllib.request.Request(TRIAGEM_URL, data=json.dumps({"contato_id": cid}).encode(),
        headers={"Authorization": "Bearer " + SROLE, "Content-Type": "application/json"}, method="POST")
    return json.load(urllib.request.urlopen(req, timeout=60)).get("status")

conts = supa("GET", "contatos", params="?origem=eq.whatsapp&select=id,telefone")
print(f"contatos whatsapp: {len(conts)}")
for c in conts:
    ph = c["telefone"]; jid = f"{ph}@s.whatsapp.net"
    try:
        raw = evo(f"/chat/findMessages/{INSTANCE}", {"where": {"key": {"remoteJid": jid}}})
    except Exception as e:
        print(f"  {ph}: evo err {e}"); continue
    recs = raw.get("messages", {}).get("records", []) if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])
    rows = []
    for d in recs:
        m = d.get("message") or {}
        txt = m.get("conversation") or (m.get("extendedTextMessage") or {}).get("text")
        if not txt: continue
        ts = d.get("messageTimestamp"); ts = ts if isinstance(ts, int) else int(ts or 0)
        rows.append((ts, bool(d.get("key", {}).get("fromMe")), txt))
    rows.sort(key=lambda x: x[0])
    conversa = "\n".join(f"{'EMPRESA' if fm else 'CLIENTE'}: {t}" for _, fm, t in rows)[:3000]
    if not conversa.strip():
        print(f"  {ph}: sem texto"); continue
    supa("PATCH", "contatos", body={"texto_conversa": conversa},
         params=f"?id=eq.{c['id']}", prefer="return=minimal")
    st = triagem(c["id"])
    print(f"  {ph}: {len(rows)} msgs -> {st}")
    time.sleep(2)
print("ok")
