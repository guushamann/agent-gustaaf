import { ChatCompletionMessageParam, ChatCompletionTool } from "together-ai/resources/chat/completions.mjs";
import { questionWithToolTogetherAi } from "./question.ai.together";

export async function callLLM(messages: Array<ChatCompletionMessageParam>, tools: Array<ChatCompletionTool>) {
  const response = await questionWithToolTogetherAi(messages, "", tools);
  return response;
}
