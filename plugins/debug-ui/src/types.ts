export type AgentEvent =
  | { type: 'USER_MESSAGE'; content: string }
  | { type: 'ASSISTANT_MESSAGE'; content?: string; toolCalls?: Array<{ name: string; args: Record<string, unknown> }> }
  | { type: 'TOOL_RUNNING'; toolName: string; args: Record<string, any> }
  | { type: 'TOOL_RESULT'; toolName: string; result: string }
  | { type: 'TEXT_DELTA'; delta: string }
  | { type: 'AWAITING_USER_INPUT'; requestId: string; prompt: string; choices?: string[] }
  | { type: 'COMPLETED'; result: string }
  | { type: 'FAILED'; error: string }
  | { type: string; [key: string]: unknown };
