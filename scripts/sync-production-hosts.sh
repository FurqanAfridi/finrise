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

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx not found; skip vhost update"
  exit 0
fi

python3 - <<'PY'
from pathlib import Path

needles = ["fundlookup.co"]
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
        if "fundlookup.co" not in text:
            continue
        if required in text:
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
  echo "nginx -t failed; not reloading. Fix the vhost, then: certbot --nginx -d fundlookup.co -d app.fundlookup.co -d admin.fundlookup.co"
  exit 1
fi

if command -v certbot >/dev/null 2>&1 && [[ ! -f "$APP_DIR/.host-ssl-app" ]]; then
  if certbot --nginx --non-interactive --expand --redirect \
    -d fundlookup.co -d app.fundlookup.co -d admin.fundlookup.co; then
    touch "$APP_DIR/.host-ssl-app"
  else
    echo "certbot expand skipped or failed; issue a cert that includes app.fundlookup.co"
  fi
fi
