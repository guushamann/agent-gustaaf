export type AgentEvent =
  | { type: 'TEXT_DELTA'; delta: string }
  | { type: 'TOOL_RUNNING'; toolName: string; args: Record<string, any> }
  | { type: 'AWAITING_USER_INPUT'; requestId: string; prompt: string; choices?: string[] }
  | { type: 'COMPLETED'; result: string }
  | { type: 'FAILED'; error: string };
