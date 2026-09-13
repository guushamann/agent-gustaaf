import Redis from "ioredis";
import express from "express";
import { initSubscriptionUserMessages } from "./agent";
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

function createSubscriber(): Redis {
  const subscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  return subscriber;
}

export function setupTransport(app: express.Express) {
  // Express SSE Endpoint
  app.get('/api/threads/:threadId/stream', async (req, res) => {
    const { threadId } = req.params;

    await initSubscriptionUserMessages(threadId);
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.flushHeaders();

    // Dedicated subscriber connection per request so disconnecting
    // one client does not kill the shared publisher connection
    const subscriber = createSubscriber();
    subscriber.subscribe(`thread:${threadId}`);
    subscriber.on('message', (_, message) => {
      res.write(`data: ${message}\n\n`);
    });

    req.on('close', () => subscriber.disconnect());
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