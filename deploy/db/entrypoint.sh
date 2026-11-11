#!/bin/bash
# Purpose: chown the Fly volume, then hand off to the official Postgres entrypoint.
set -euo pipefail

mkdir -p "${PGDATA:-/data/pgdata}"
chown -R postgres:postgres /data
exec docker-entrypoint.sh postgres
