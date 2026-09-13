import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { ChatCompletionMessageParam } from 'together-ai/resources/chat/completions.mjs';
import { loadState, saveState } from './agentState';
import { redis as publisher } from './agentStateServer';
import { AgentEvent } from './agentEvent';
import { callLLM } from './agentCallLlm';
import { tools, toolHandlers } from './tools';
import { parseXmlToolCalls } from './xmlToolCallParser';

// Dedicated subscriber connection; publishing must go through `publisher`
// because a subscribed Redis client cannot issue other commands
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

function publishEvent(threadId: string, event: AgentEvent) {
  publisher.publish(`thread:${threadId}`, JSON.stringify(event));
}

export async function initSubscriptionUserMessages(threadId: string) {
  redis.subscribe(`user_messages:${threadId}`, (err) => {
    if (err) console.error(err);
  });
  redis.on('message', (channel, message) => {
    runAgentStep(threadId, message).catch((error) => {
      console.error(`Unhandled agent error for thread ${threadId}:`, error);
      publishEvent(threadId, {
        type: 'FAILED',
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

export async function runAgentStep(threadId: string, userInput?: string) {
  try {
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
        publishEvent(threadId, {
          type: 'TOOL_RESULT',
          toolName: 'ask_user',
          result: userInput,
        });
      } else {
        // First turn or ordinary user input.
        state.messages.push({ role: 'user', content: userInput });
        publishEvent(threadId, { type: 'USER_MESSAGE', content: userInput });
      }
      state.status = 'RUNNING';
      state.pendingRequestId = "";
      state.pendingToolCallId = "";
    }

    // 2. Execute LLM loop
    const response = await callLLM(state.messages, tools);
    if (!response) return;

    // Some models (e.g. Qwen) emit tool calls as XML in content instead of the
    // native tool_calls field. Parse that fallback so the agent loop can execute them.
    if (response.content && (!response.tool_calls || response.tool_calls.length === 0) && response.content.includes('<tool_call>')) {
      const parsed = parseXmlToolCalls(response.content);
      if (parsed.length > 0) {
        response.tool_calls = parsed;
        response.content = "";
      }
    }

    // Keep the assistant message (with any tool_calls) in the conversation history.
    const assistantMessage: ChatCompletionMessageParam = {
      role: 'assistant',
      content: response.content,
    };
    if (response.tool_calls) {
      assistantMessage.tool_calls = response.tool_calls;
    }
    state.messages.push(assistantMessage);

    const assistantEvent: Extract<AgentEvent, { type: 'ASSISTANT_MESSAGE' }> = {
      type: 'ASSISTANT_MESSAGE',
    };
    if (response.content) {
      assistantEvent.content = response.content;
    }
    if (response.tool_calls) {
      assistantEvent.toolCalls = response.tool_calls.map((tc) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }));
    }
    publishEvent(threadId, assistantEvent);

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
        publishEvent(threadId, {
          type: 'AWAITING_USER_INPUT',
          requestId,
          prompt: args.question,
          choices: args.choices,
        });

        return; // Worker stops processing this step completely
      }

      // Execute non-interactive tool calls
      for (const toolCall of response.tool_calls) {
        const handler = toolHandlers[toolCall.function.name];
        let result: string;
        const args = JSON.parse(toolCall.function.arguments);
        publishEvent(threadId, {
          type: 'TOOL_RUNNING',
          toolName: toolCall.function.name,
          args,
        });
        if (!handler) {
          result = `Unknown tool: ${toolCall.function.name}`;
        } else {
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
        publishEvent(threadId, {
          type: 'TOOL_RESULT',
          toolName: toolCall.function.name,
          result,
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

    publishEvent(threadId, {
      type: 'COMPLETED',
      result: response.content ?? '',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Agent step failed for thread ${threadId}:`, error);
    publishEvent(threadId, { type: 'FAILED', error: errorMessage });
    throw error;
  }
}
