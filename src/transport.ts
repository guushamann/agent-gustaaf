import Redis from "ioredis";
import express from "express";
import { initSubscriptionUserMessages, runAgentStep } from "./agent";
const redis = new Redis();
export function setupTransport(app: express.Express) {
  // Express SSE Endpoint
  app.get('/api/threads/:threadId/stream', async (req, res) => {
    const { threadId } = req.params;


    await initSubscriptionUserMessages(threadId);
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');

    // Forward backend events directly to UI
    redis.subscribe(`thread:${threadId}`);
    redis.on('message', (_, message) => {
      res.write(`data: ${message}\n\n`);
    });

    req.on('close', () => redis.disconnect());
  });

  // Resuming execution when user submits answer
  app.post('/api/threads/:threadId/respond', async (req, res) => {
    const { threadId } = req.params;
    const { answer } = req.body;

    try {
      // Trigger background job/worker to wake up
      await redis.publish(`user_messages:${threadId}`, answer);
      res.json({ ok: true });
    } catch (error) {
      console.error(`Agent step failed for thread ${threadId}:`, error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });
}
