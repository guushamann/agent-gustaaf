import { mkdir } from "node:fs/promises";
import { resolve, sep } from "node:path";

const filePath = process.env.FILE_PATH;

export async function resolveSessionPath(
  threadId: string,
  requestedPath: string,
): Promise<string> {
  if (!filePath) {
    throw new Error("FILE_PATH is not configured");
  }

  const baseDir = resolve(filePath, threadId);
  const target = resolve(baseDir, requestedPath);

  if (target !== baseDir && !target.startsWith(baseDir + sep)) {
    throw new Error(`Path ${requestedPath} is outside the session folder`);
  }

  await mkdir(baseDir, { recursive: true });
  return target;
}
