// LLM helper - wraps coze-coding-dev-sdk LLMClient for non-streaming text generation
import { LLMClient, Config, HeaderUtils, type Message } from "coze-coding-dev-sdk";
import { NextRequest } from "next/server";

export function createLLMClient(request?: NextRequest) {
  const config = new Config();
  const customHeaders = request
    ? HeaderUtils.extractForwardHeaders(request.headers)
    : undefined;
  return new LLMClient(config, customHeaders);
}

export async function llmInvoke(
  messages: Message[],
  options?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<string> {
  const client = createLLMClient();
  const response = await client.invoke(messages, {
    model: options?.model,
    temperature: options?.temperature ?? 0.4,
  });
  if (!response?.content) return "";
  if (typeof response.content === "string") return response.content;
  // content may be array of content parts
  return (response.content as unknown[])
    .map((c) => {
      if (typeof c === "string") return c;
      const obj = c as { text?: string };
      return obj.text ?? "";
    })
    .join("");
}

export type { Message };
