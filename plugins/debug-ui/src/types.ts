export type AgentEvent =
  | { type: 'AWAITING_USER_INPUT'; requestId: string; prompt: string; choices?: string[] }
  | { type: 'COMPLETED'; result: string }
  | { type: string; [key: string]: unknown };
