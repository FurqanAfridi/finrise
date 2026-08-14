#!/usr/bin/env bash
# Align production .env hosts and nginx server_name for lander / app / admin.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/finrise}"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $APP_DIR/.env"
  exit 1
fi

python3 - <<'PY'
from pathlib import Path

p = Path(".env")
raw = p.read_text()
wanted = {
    "AUTH_URL": "https://app.fundlookup.co",
    "NEXT_PUBLIC_APP_URL": "https://app.fundlookup.co",
    "BRAND_SITE_URL": "https://fundlookup.co",
    "PLATFORM_ADMIN_URL": "https://admin.fundlookup.co",
    "GOOGLE_REDIRECT_URI": "https://app.fundlookup.co/api/integrations/google/callback",
}
found = set()
out = []
for line in raw.splitlines():
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in line:
        out.append(line)
        continue
    key = line.split("=", 1)[0].strip()
    if key in wanted:
        out.append(f'{key}="{wanted[key]}"')
        found.add(key)
    else:
        out.append(line)
for key, val in wanted.items():
    if key not in found:
        out.append(f'{key}="{val}"')
text = "\n".join(out) + "\n"
if text != raw:
    p.write_text(text)
    print("Updated public host URLs in .env")
else:
    print("Public host URLs already aligned")
PY

CADDYFILE="${CADDYFILE:-/root/database/supabase/docker/volumes/proxy/caddy/Caddyfile}"
if [[ -f "$CADDYFILE" ]]; then
  python3 - <<PY
from pathlib import Path
p = Path("$CADDYFILE")
text = p.read_text()
required = "app.fundlookup.co"
if required in text:
    print("Caddyfile already has app.fundlookup.co")
else:
    needle = "fundlookup.co, www.fundlookup.co {"
    if needle in text:
        text = text.replace(needle, "fundlookup.co, www.fundlookup.co, app.fundlookup.co {", 1)
        p.write_text(text)
        print("Added app.fundlookup.co to apex Caddy site")
    elif "fundlookup.co {" in text:
        text = text.replace("fundlookup.co {", "fundlookup.co, app.fundlookup.co {", 1)
        p.write_text(text)
        print("Added app.fundlookup.co next to fundlookup.co")
    else:
        p.write_text(text + """

# --- Fundlookup app ---
app.fundlookup.co {
    reverse_proxy 172.17.0.1:3001
}
""")
        print("Appended app.fundlookup.co Caddy site block")
PY
  if docker exec supabase-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
    && docker exec supabase-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
    echo "Caddy reloaded with app.fundlookup.co"
  else
    echo "Caddy reload failed; add app.fundlookup.co to $CADDYFILE and reload supabase-caddy"
  fi
else
  echo "Caddyfile not found at $CADDYFILE"
fi

if command -v nginx >/dev/null 2>&1; then
python3 - <<'PY'
from pathlib import Path

required = "app.fundlookup.co"
roots = [Path("/etc/nginx/sites-enabled"), Path("/etc/nginx/conf.d"), Path("/etc/nginx/sites-available")]
changed = []
for root in roots:
    if not root.exists():
        continue
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        try:
            text = path.read_text()
        except OSError:
            continue
        if "fundlookup.co" not in text or required in text:
            continue
        updated = []
        for line in text.splitlines(True):
            if "server_name" in line and "fundlookup.co" in line and required not in line:
                stripped = line.rstrip("\n")
                suffix = "\n" if line.endswith("\n") else ""
                if stripped.rstrip().endswith(";"):
                    stripped = stripped.rstrip()[:-1] + f" {required};"
                else:
                    stripped = stripped + f" {required}"
                line = stripped + suffix
                changed.append(str(path))
            updated.append(line)
        path.write_text("".join(updated))
if changed:
    print("Added app.fundlookup.co to: " + ", ".join(dict.fromkeys(changed)))
else:
    print("nginx already includes app.fundlookup.co or no vhost found")
PY
  if nginx -t; then
    systemctl reload nginx || service nginx reload || true
  else
    echo "nginx -t failed; not reloading"
  fi
fi
