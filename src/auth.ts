import type { NextFunction, Request, Response } from "express";
import { validateApiKey } from "./apiKeys";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"];
  const raw = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : (req.headers["x-api-key"] as string | undefined);

  if (!raw) {
    res.status(401).json({ error: "Missing API key. Send 'Authorization: Bearer <key>' or 'x-api-key: <key>'." });
    return;
  }
  if (!validateApiKey(raw)) {
    res.status(401).json({ error: "Invalid or revoked API key." });
    return;
  }
  next();
}