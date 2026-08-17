
import { ChatCompletionTool } from 'together-ai/resources/chat/completions.mjs';

export const tools: Array<ChatCompletionTool> =[
  {
    type: "function",
    function: {
      name: "ask_user",
      description: "Ask the user a clarifying question when critical information is missing or ambiguous.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The question",
          }
        },
        required: ["question"],
      },
    },
  },
]

type Tools = typeof tools;
