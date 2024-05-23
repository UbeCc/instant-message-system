export interface Message {
  id: string; // 消息ID
  conversation: string; // 会话 ID
  sender: string; // 发送者
  content: string; // 消息内容
  createTime: Date; // 时间戳
}

export interface Conversation {
  id: string; // 会话ID
  type: "group_chat" | "private_chat"; // 会话类型：群聊或私聊
  members: string[]; // 会话成员列表
  unreadCount?: number; // 未读计数
  name: string; // 会话名称
}

export type ChatType = "group_chat" | "private_chat";