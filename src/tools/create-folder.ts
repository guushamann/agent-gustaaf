import { mkdir } from "node:fs/promises";
import { resolveSessionPath } from "./session-path";

export async function createFolder(path: string, threadId: string): Promise<string> {
  const resolved = await resolveSessionPath(threadId, path);
  await mkdir(resolved, { recursive: true });
  return `Created folder ${resolved}`;
}
