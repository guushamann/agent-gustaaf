import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveSessionPath } from "./session-path";

export async function writeFileTool(path: string, content: string, threadId: string): Promise<string> {
  const resolved = await resolveSessionPath(threadId, path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, "utf-8");
  return `Wrote file ${resolved}`;
}
