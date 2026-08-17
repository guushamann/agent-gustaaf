import Redis from "ioredis";
import express from "express";
import { runAgentStep } from "./agent";
const app = express();
app.use(express.json());
const port = 3000;
// Express SSE Endpoint
app.get('/api/threads/:threadId/stream', async (req, res) => {
  const { threadId } = req.params;
  const sub = new Redis();

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');

  // Forward backend events directly to UI
  sub.subscribe(`thread:${threadId}`);
  sub.on('message', (_, message) => {
    res.write(`data: ${message}\n\n`);
  });

  req.on('close', () => sub.disconnect());
});

// Resuming execution when user submits answer
app.post('/api/threads/:threadId/respond', async (req, res) => {
  const { threadId } = req.params;
  const { answer } = req.body;

  try {
    // Trigger background job/worker to wake up
    await runAgentStep(threadId, answer);
    res.json({ ok: true });
  } catch (error) {
    console.error(`Agent step failed for thread ${threadId}:`, error);
    res.status(500).json({ ok: false, error: String(error) });
  }
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
