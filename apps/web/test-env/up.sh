#!/bin/sh
# Generates throwaway passwords for the pk-f1 test environment (never reused anywhere else).
set -eu
dir=$(cd "$(dirname "$0")" && pwd)
env="$dir/.env"
if [ ! -f "$env" ]; then
  umask 077
  gen() { head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
  {
    echo "PK_F1_PG_SUPERUSER_PASSWORD=$(gen)"
    echo "PK_F1_OWNER_PASSWORD=$(gen)"
    echo "PK_F1_APP_PASSWORD=$(gen)"
    echo "PK_F1_RO_PASSWORD=$(gen)"
    echo "PK_F1_KC_ADMIN_PASSWORD=$(gen)"
  } > "$env"
  echo "wrote $env"
fi
