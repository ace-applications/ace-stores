#!/usr/bin/env bash
# font-deploy invariant check: goes RED when the served CSS's @font-face
# sources 404 or stop decoding as woff2 — the exact "fonts broken" symptom.
# Usage: bash scripts/font-check.sh [base-url]
set -u
BASE="${1:-https://ace.seifsheikhelarab.workers.dev}"
TMP="$(mktemp -d)"
fail=0

HTML_CODE=$(curl -sS -o "$TMP/page.html" -w "%{http_code}" "$BASE/admin")
echo "GET $BASE/admin -> $HTML_CODE"
[ "$HTML_CODE" = 200 ] || { echo "RED: page not 200"; exit 1; }

CSS=$(grep -o 'root-[A-Za-z0-9_-]*\.css' "$TMP/page.html" | head -1)
[ -n "$CSS" ] || { echo "RED: no root css link in html"; exit 1; }
echo "css bundle: $CSS"

curl -sS "$BASE/assets/$CSS" -o "$TMP/root.css"
grep -c "@font-face" "$TMP/root.css" | grep -qv 0 || { echo "RED: no @font-face in css"; exit 1; }
grep -o "font-display:swap" "$TMP/root.css" | head -1 >/dev/null || { echo "RED: font-display:swap missing"; fail=1; }

# every @font-face src must 200 AND start with the wOF2 magic
FONTS=$(grep -o 'url(/assets/[^)]*woff2)' "$TMP/root.css" | sed 's/url(//;s/)//' | sort -u)
[ -n "$FONTS" ] || { echo "RED: css has no resolved /assets woff2 urls (unresolved relative paths?)"; exit 1; }

for f in $FONTS; do
  CODE=$(curl -sS -o "$TMP/f.bin" -w "%{http_code}" "$BASE$f")
  MAGIC=$(head -c 4 "$TMP/f.bin")
  if [ "$CODE" = 200 ] && [ "$MAGIC" = "wOF2" ]; then
    echo "  OK   $f"
  else
    echo "  RED  $f -> http $CODE magic '$MAGIC'"
    fail=1
  fi
done

[ $fail -eq 0 ] && echo "GREEN: all faces resolve and decode as woff2" || echo "RED: broken faces"
exit $fail
