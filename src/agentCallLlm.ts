import { ChatCompletionMessageParam, ChatCompletionTool } from "together-ai/resources/chat/completions.mjs";
import { questionWithToolTogetherAi } from "./question.ai.together";

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to tools.
Use the provided tools to complete tasks step by step.
When you need to perform an action, call the appropriate tool using the tool_calls mechanism.
Do not output tool calls as XML or other text formats.
If no tool is needed, answer directly.`;

export async function callLLM(messages: Array<ChatCompletionMessageParam>, tools: Array<ChatCompletionTool>) {
  const response = await questionWithToolTogetherAi(messages, SYSTEM_PROMPT, tools);
  return response;
}
