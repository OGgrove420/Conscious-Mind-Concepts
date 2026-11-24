#!/usr/bin/env python3
"""Read-only Vercel deployment inspector for conscious-mind-concepts.
Lists latest production deployments, prints build logs for the newest failure."""
import json, sys, urllib.request, urllib.parse

ENV = "/opt/data/cmc-store/app/.env.local"
tok = pid = None
with open(ENV) as f:
    for line in f:
        if line.startswith("VERCEL_TOKEN="):
            tok = line.split("=", 1)[1].strip()
        elif line.startswith("VERCEL_PROJECT_ID="):
            pid = line.split("=", 1)[1].strip()

if not tok or not pid:
    sys.exit("missing VERCEL_TOKEN or VERCEL_PROJECT_ID in .env.local")

def api(path, **params):
    url = f"https://api.vercel.com{path}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

ds = api("/v6/deployments", projectId=pid, limit=3, target="production")
print(json.dumps([{k: d.get(k) for k in ("uid", "readyState", "url", "createdAt", "target")}
                  for d in ds.get("deployments", [])], indent=1))

newest = ds.get("deployments", [])[0] if ds.get("deployments") else None
if newest:
    uid = newest["uid"]
    ev = api(f"/v3/deployments/{uid}/events", limit=100, builds=1, direction="forward")
    events = ev if isinstance(ev, list) else ev.get("events", [])
    lines = []
    for e in events:
        t = e.get("payload", {}).get("text", "") or e.get("text", "") or ""
        if t.strip():
            lines.append(t.rstrip())
    print("---- build events (%d lines, last 80) ----" % len(lines))
    print("\n".join(lines[-80:]) if lines else "(none)")
