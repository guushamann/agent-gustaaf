import { randomUUID } from "node:crypto";

export interface ParsedToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
  index: number;
}

export function parseXmlToolCalls(content: string): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];
  const toolRegex = /<tool_call>\s*<function=(\w+)>([\s\S]*?)<\/function>\s*<\/tool_call>/g;

  let match;
  let index = 0;
  while ((match = toolRegex.exec(content)) !== null) {
    const name = match[1]!;
    const inner = match[2]!;
    const args: Record<string, string> = {};
    const paramRegex = /<parameter=(\w+)>([\s\S]*?)<\/parameter>/g;

    let paramMatch;
    while ((paramMatch = paramRegex.exec(inner)) !== null) {
      args[paramMatch[1]!] = paramMatch[2]!;
    }

    toolCalls.push({
      id: randomUUID(),
      type: "function",
      function: {
        name,
        arguments: JSON.stringify(args),
      },
      index: index++,
    });
  }

  return toolCalls;
}
