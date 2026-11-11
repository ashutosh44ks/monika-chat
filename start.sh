#!/usr/bin/env sh
# start both client and server
cd "$(dirname "$0")" || exit 1
(cd client && npm run dev) &
(cd server && npm run dev)
wait
