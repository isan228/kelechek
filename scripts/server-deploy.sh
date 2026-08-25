#!/usr/bin/env bash
# Обёртка для GitHub Actions. То же, что scripts/update.sh
exec bash "$(cd "$(dirname "$0")" && pwd)/update.sh"
