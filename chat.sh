#!/usr/bin/env bash

THREAD_ID="${1:-thread-$(date +%s)-$RANDOM}"
BASE_URL="${AGENT_URL:-http://localhost:3000}"

echo "Thread: $THREAD_ID" >&2

# Start the SSE stream in the background so incoming events print live.
curl -N -H "Accept: text/event-stream" \
    "$BASE_URL/api/threads/$THREAD_ID/stream" &
SSE_PID=$!

cleanup() {
    kill "$SSE_PID" 2>/dev/null || true
    wait "$SSE_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Helper to safely escape user input as a JSON string.
json_escape() {
    node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"
}

while IFS= read -rp "> " message; do
    [[ -z "$message" ]] && continue

    payload='{"answer": '$(json_escape "$message")'}'
    curl -s -X POST "$BASE_URL/api/threads/$THREAD_ID/respond" \
        -H "Content-Type: application/json" \
        -d "$payload" >/dev/null
done
