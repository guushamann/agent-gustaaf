import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { loadState, saveState } from './agentState';
import { AgentEvent } from './agentEvent';
import { callLLM } from './agentCallLlm';
import { tools, toolHandlers } from './tools';

const redis = new Redis();

export async function initSubscriptionUserMessages(threadId: string) {
  redis.subscribe(`user_messages:${threadId}`, (err) => {
    if (err) console.error(err);
  });
  redis.on('message', (channel, message) => {
    runAgentStep(threadId, message)
  });
}

export async function runAgentStep(threadId: string, userInput?: string) {
  // 1. Load conversation state
  const state = await loadState(threadId);

  if (userInput) {
    if (state.status === 'WAITING_FOR_USER' && state.pendingToolCallId) {
      // The user's answer completes the pending tool call.
      state.messages.push({
        role: 'tool',
        content: userInput,
        tool_call_id: state.pendingToolCallId,
      });
    } else {
      // First turn or ordinary user input.
      state.messages.push({ role: 'user', content: userInput });
    }
    state.status = 'RUNNING';
    state.pendingRequestId = "";
    state.pendingToolCallId = "";
  }

  // 2. Execute LLM loop
  const response = await callLLM(state.messages, tools);
  if (!response) return;

  // Keep the assistant message (with any tool_calls) in the conversation history.
  state.messages.push(response);

  // 3. Handle tool calls
  if (response.tool_calls && response.tool_calls.length > 0) {
    const firstToolCall = response.tool_calls[0]!;

    // Human-in-the-Loop tool call
    if (firstToolCall.function.name === 'ask_user') {
      const toolCall = firstToolCall;
      const args = JSON.parse(toolCall.function.arguments);
      const requestId = randomUUID();

      // Save pending state
      await saveState(threadId, {
        ...state,
        status: 'WAITING_FOR_USER',
        pendingRequestId: requestId,
        pendingToolCallId: toolCall.id,
      });

      // Notify listeners via event bus
      await redis.publish(`thread:${threadId}`, JSON.stringify({
        type: 'AWAITING_USER_INPUT',
        requestId,
        prompt: args.question,
        choices: args.choices,
      } as AgentEvent));

      return; // Worker stops processing this step completely
    }

    // Execute non-interactive tool calls
    for (const toolCall of response.tool_calls) {
      const handler = toolHandlers[toolCall.function.name];
      let result: string;
      if (!handler) {
        result = `Unknown tool: ${toolCall.function.name}`;
      } else {
        const args = JSON.parse(toolCall.function.arguments);
        try {
          result = await handler(args, threadId);
        } catch (error) {
          result = `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
      state.messages.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id,
      });
    }

    await saveState(threadId, {
      ...state,
      status: 'RUNNING',
    });

    return runAgentStep(threadId);
  }

  // 4. Normal assistant reply
  await saveState(threadId, {
    ...state,
    status: 'COMPLETED',
  });

  await redis.publish(`thread:${threadId}`, JSON.stringify({
    type: 'COMPLETED',
    result: response.content ?? '',
  } as AgentEvent));
}
