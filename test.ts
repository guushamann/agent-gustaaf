tsx --env-file=.env.local transport.ts
curl - X POST http://localhost:3000/api/threads/123/respond \
  -H "Content-Type: application/json" \
  -d '{"answer": "Try to figure out what the users name is"}'

curl -N -H "Accept: text/event-stream" \
    http://localhost:3000/api/threads/123/stream
  curl: (52) Empty reply from server
