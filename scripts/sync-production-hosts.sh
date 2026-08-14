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

python3 - <<'PY'
from pathlib import Path

required = "app.fundlookup.co"
changed = []

def add_caddy_host(text: str) -> str:
    if required in text:
        return text
    out = []
    for line in text.splitlines(True):
        stripped = line.lstrip()
        if stripped.startswith("#"):
            out.append(line)
            continue
        if "fundlookup.co" in line and "{" in line and required not in line:
            indent = line[: len(line) - len(line.lstrip())]
            rest = line.strip()
            brace = rest.find("{")
            names = rest[:brace].rstrip()
            tail = rest[brace:]
            line = f"{indent}{required}, {names} {tail}\n" if line.endswith("\n") else f"{indent}{required}, {names} {tail}"
            changed.append("caddy-site")
        out.append(line)
    return "".join(out)

caddy_files = [Path("/etc/caddy/Caddyfile")]
confd = Path("/etc/caddy/Caddyfile.d")
if confd.is_dir():
    caddy_files.extend(sorted(p for p in confd.iterdir() if p.is_file()))
confd2 = Path("/etc/caddy/conf.d")
if confd2.is_dir():
    caddy_files.extend(sorted(p for p in confd2.iterdir() if p.is_file()))

for path in caddy_files:
    if not path.is_file():
        continue
    try:
        text = path.read_text()
    except OSError:
        continue
    if "fundlookup.co" not in text:
        continue
    updated = add_caddy_host(text)
    if updated != text:
        path.write_text(updated)
        print(f"Added {required} to {path}")

if not any("caddy-site" == c for c in changed):
    print("Caddy already includes app.fundlookup.co or no Caddyfile found")
PY

if command -v caddy >/dev/null 2>&1; then
  if caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 || caddy fmt --overwrite /etc/caddy/Caddyfile >/dev/null 2>&1; then
    true
  fi
  systemctl reload caddy 2>/dev/null || service caddy reload 2>/dev/null || caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || echo "Could not reload Caddy automatically"
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
