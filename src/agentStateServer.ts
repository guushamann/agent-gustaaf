import Redis from 'ioredis';
import { ChatCompletionMessageParam } from 'together-ai/resources/chat/completions.mjs';

// Instantiate your shared Redis connection
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export type Message = ChatCompletionMessageParam;

export type AgentStatus = 'RUNNING' | 'WAITING_FOR_USER' | 'COMPLETED' | 'FAILED';

export interface AgentState {
  threadId: string;
  status: AgentStatus;
  messages: Message[];
  pendingRequestId?: string;
  pendingToolCallId?: string;
  updatedAt: number;
}
