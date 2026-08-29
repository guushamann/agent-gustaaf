import { readFile } from "node:fs/promises";
import { resolveSessionPath } from "./session-path";

export async function readFileTool(path: string, threadId: string): Promise<string> {
  const resolved = await resolveSessionPath(threadId, path);
  return readFile(resolved, "utf-8");
}
