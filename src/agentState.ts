import { AgentState, redis } from "./agentStateServer";
// Prefix keys to avoid collisions in shared Redis instances
const STATE_PREFIX = 'agent:state:';
// Optional: Auto-expire inactive agent threads after 7 days (604,800 seconds)
const THREAD_TTL_SECONDS = 60 * 60 * 24 * 7;
/**
 * Saves or updates the agent's thread state in Redis.
 */
export async function saveState(threadId: string, state: AgentState): Promise<void> {
  const key = `${STATE_PREFIX}${threadId}`;

  // Always keep timestamp updated
  const updatedState: AgentState = {
    ...state,
    updatedAt: Date.now(),
  };

  const serialized = JSON.stringify(updatedState);

  // Set value and assign Time-To-Live (EX) so stale threads clean themselves up
  await redis.set(key, serialized, 'EX', THREAD_TTL_SECONDS);
}

/**
 * Loads the current agent thread state from Redis.
 * Returns an initial blank state if no state exists for the given threadId.
 */
export async function loadState(threadId: string): Promise<AgentState> {
  const key = `${STATE_PREFIX}${threadId}`;
  const rawData = await redis.get(key);

  if (!rawData) {
    // Default initial state for a new conversation thread
    return {
      threadId,
      status: 'RUNNING',
      messages: [],
      updatedAt: Date.now(),
    };
  }

  try {
    return JSON.parse(rawData) as AgentState;
  } catch (error) {
    console.error(`Failed to parse state for thread ${threadId}:`, error);
    throw new Error(`Corrupted state data in Redis for thread ${threadId}`);
  }
}
