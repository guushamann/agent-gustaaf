import express from "express";
import { generateApiKey, listApiKeys, renameApiKey, revokeApiKey } from "./apiKeys";
import { adminHtml } from "./adminHtml";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!ADMIN_TOKEN) {
    res.status(503).json({ error: "Admin disabled. Set ADMIN_TOKEN in .env.local to enable." });
    return;
  }
  const header = req.headers["authorization"];
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (!token || token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function setupAdmin(app: express.Express) {
  app.get("/admin", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(adminHtml);
  });

  app.get("/admin/keys", requireAdmin, (_req, res) => {
    res.json(listApiKeys());
  });

  app.post("/admin/keys", requireAdmin, (req, res) => {
    const name = typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : null;
    const created = generateApiKey();
    if (name) renameApiKey(created.id, name);
    res.status(201).json(name ? { ...created, name } : created);
  });

  app.delete("/admin/keys/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid key id" });
      return;
    }
    if (!revokeApiKey(id)) {
      res.status(404).json({ error: "Key not found or already revoked" });
      return;
    }
    res.json({ ok: true });
  });
}