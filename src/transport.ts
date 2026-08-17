import Redis from "ioredis";
import express from "express";
import { initSubscriptionUserMessages, runAgentStep } from "./agent";

export function setupTransport(app: express.Express) {
  // Express SSE Endpoint
  app.get('/api/threads/:threadId/stream', async (req, res) => {
    const { threadId } = req.params;
    const sub = new Redis();

    await initSubscriptionUserMessages(threadId);
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
    const redis = new Redis();

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
