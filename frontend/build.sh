#!/bin/sh
set -a
[ -f .env ] && . .env
set +a
npm run build
