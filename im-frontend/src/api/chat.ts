import { Conversation, Message } from "./types";
import { BACKEND_URL } from "../constants/string";


export interface GetMessagesArgs {
  me?: string;
  conversationID?: string;
  cursor?: Date;
  limit?: number;
}

export interface AddConversationArgs {
  type: "private_chat" | "group_chat";
  members: string[];
}

export interface GetConversationsArgs {
  idList: string[];
}

// 从服务器获取消息列表
export async function getMessages({
  conversationID,
  cursor,
  limit,
}: GetMessagesArgs, token: string) {
  const messages: Message[] = [];
  while (true) {
    const url = `${BACKEND_URL}/api/message/get?conversationID=${conversationID}&after=${cursor || 0}&limit=${limit || 100}`;
    const response  = await fetch(url,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${token}`,
        },
      });
    const data = await response.json();
    if(data.messages) data.messages.forEach((item: Message) => messages.push(item)); // 将获取到的消息添加到列表中
    if (!data.has_next) break; // 如果没有下一页，则停止循环
    cursor = messages[messages.length - 1].createTime; // 更新游标为最后一条消息的时间戳，用于下轮查询
  }
  return messages;
}

/**
 * @summary 创建群组
 * @param {type} 会话类型
 * @param {members} 会话成员列表
 */
export async function createGroup(members: string[], token: string)  {
  const response = await fetch(`${BACKEND_URL}/api/group/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${token}`,
    },
    body: JSON.stringify({
      members,
    }),
  });
  const data = await response.json();
  return data as Conversation;
}