import Together from 'together-ai';

import { z } from 'zod';
import { Message } from './agentStateServer';
import { ChatCompletionMessage, ChatCompletionMessageParam } from 'together-ai/resources/chat/completions.mjs';
import { Tools } from 'together-ai/resources';
const together = new Together();
export async function QuestionTogetherAi<T extends z.Schema>(question: string, choiceSchema: T,systemContent:string) : Promise<z.infer<T> | null> {



  const jsonSchema = z.toJSONSchema(choiceSchema);
  const extract = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `${systemContent}, Only answer in JSON and follow this schema ${JSON.stringify(choiceSchema)}.`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      model: "Qwen/Qwen3.5-9B",
      max_tokens: 8192,
      reasoning: { enabled: false },
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "answer",
          schema: jsonSchema,
        },
      },
    });

  if (extract?.choices?.[0]?.message?.content) {
    return JSON.parse(extract.choices[0].message.content);
  } else {
    return null;
  }

}

export async function SimpleQuestionTogetherAi(question: string, systemContent:string) : Promise<string> {

  const simpleExtract = await together.chat.completions.create({
    messages: [
        {
          role: "system",
          content: systemContent,
        },
        {
          role: "user",
          content: question,
        },
      ],
      model: "Qwen/Qwen3.5-9B",
      max_tokens: 8192,
      reasoning: { enabled: false },
    });

  if (simpleExtract?.choices?.[0]?.message?.content) {
    return simpleExtract.choices[0].message.content;
  } else {
    return "";
  }

}

export async function questionWithToolTogetherAi(messages: Array<ChatCompletionMessageParam>, systemContent: string, tools: any) : Promise<ChatCompletionMessage | undefined> {
  const requestMessages = systemContent
    ? [{ role: "system", content: systemContent } as ChatCompletionMessageParam, ...messages]
    : messages;

  const simpleExtract = await together.chat.completions.create({
    messages: requestMessages,
    tools,
    model: "zai-org/GLM-5.3-Flash",

    });

  return simpleExtract.choices[0]?.message;
}
