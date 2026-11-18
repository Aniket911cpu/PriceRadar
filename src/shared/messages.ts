import { messageSchema, type Message, type MessageResponse } from "./schemas";

export function parseMessage(input: unknown): Message {
  return messageSchema.parse(input);
}

export async function sendMessage(message: Message): Promise<MessageResponse> {
  const parsed = messageSchema.parse(message);
  return chrome.runtime.sendMessage(parsed) as Promise<MessageResponse>;
}
