import Dexie from "dexie";
import { Conversation, Message, ChatType } from "./types";
import { getMessages } from "./chat";
import { checkIsFriend, getFriends, getGroups } from "../utils/fetch";
import { BACKEND_URL } from "../constants/string";
import { FriendData, GroupData } from "../types/userinfo";
import { UserCursor } from "../pages/_app";

// 定义一个继承自Dexie的类，用于管理本地缓存在IndexedDB的数据
export class CachedData extends Dexie {
  messages: Dexie.Table<Message, string>; // 定义一个Dexie表用于存储消息，以数字类型的ID作为主键
  conversations: Dexie.Table<Conversation, string>; // 定义一个Dexie表用于存储消息，以数字类型的ID作为主键
  activeConversationId: string | null;

  constructor() {
    super("CachedData"); // 指定数据库名称
    this.version(1).stores({
      messages: "&id, sender, conversation, createTime",
      conversations: "&id, type, name",
    });
    this.messages = this.table("messages"); // 获取到Dexie表实例
    this.conversations = this.table("conversations"); // 获取到Dexie表实例
    this.activeConversationId = null;
  }

  async clearCachedData() {
    await this.messages.clear();
    await this.conversations.clear();
  }

  async initConversations(token: string, username: string) {
    // 获取朋友和群组数据
    const userCursor: UserCursor = {};

    const friends: FriendData[] = await getFriends(token);
    const groups: GroupData[] = await getGroups(token);
    // 准备朋友对话数据
    const friendConversations = await Promise.all(friends.map(async (friend) => {
        const friendshipId = await checkIsFriend(token, username, friend.username);
        if (typeof friendshipId === "string") {
            const messages = this.messages.where("conversation").equals(friendshipId);
            const friendUnreadCount = await messages.filter((message) => {
              console.log("message", message.createTime, "cursor", new Date(friend.cursor), "result", new Date(message.createTime).getTime() > new Date(friend.cursor).getTime());
              return (new Date(message.createTime).getTime() > new Date(friend.cursor).getTime()) && message.sender !== username;
            }).count();
            if (!userCursor[friendshipId]) {
              userCursor[friendshipId] = {}; // 如果还没有这个 id 的记录，先初始化为空对象
            }
            console.log("FRIENDCURSOR", friendshipId, friend.username, username);
            userCursor[friendshipId][friend.username] = friend.friendCursor;
            userCursor[friendshipId][username] = friend.cursor;
            return {
                id: friendshipId,
                type: "private_chat" as ChatType,
                members: [username, friend.username],
                name: friend.username,
                unreadCount: friendUnreadCount,
                cursor: friend.cursor,
                userCursors: [friend.friendCursor],
              };
            // 更新 cursor
        } else {
            throw new Error("FriendshipId 不是字符串");
        }
    }));

    // 准备群组对话数据
    const groupConversations = await Promise.all(groups.map(async (group) => {
        const id = group.groupID;
        const messages = this.messages.where("conversation").equals(id);
        const groupUnreadCount = await messages.filter((message) => ((new Date(message.createTime).getTime() > new Date(group.cursor).getTime()) && message.sender !== username)).count();
        const members = group.userList;
        const userCursors = group.userCursors;
        for (let i = 0; i < group.userList.length; i++) {
          if (!userCursor[id]) {
            userCursor[id] = {}; // 如果还没有这个 id 的记录，先初始化为空对象
          }
          userCursor[id][members[i]] = userCursors[i];
        }
        return {
            id,
            type: "group_chat" as ChatType,
            name: group.groupname,
            unreadCount: groupUnreadCount,
            cursor: group.cursor,
            members,
            userCursors,
        };
    }));
    // 将所有对话插入数据库
    await this.conversations.bulkPut([...friendConversations, ...groupConversations]);
    await this.pullMessagesFromConversation(token, username, userCursor);
    return userCursor;
  }

  // 添加本地收到的新消息
  async addMessage(message: Message) {
    const count = await this.messages.where("id").equals(message.id).count();
    if(count === 0) {
      await this.messages.add(message);
    }
  }

  // 从服务器拉取新消息 (会话消息链) 并更新本地缓存
  async pullMessagesFromConversation(token: string, username: string, userCursor: UserCursor) {
    const response = await fetch(`${BACKEND_URL}/api/list/conversation`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `${token}`,
      },
    });
    const data = await response.json();
    const conversationIDs = data.conversationIDs;
    for (const conversationID of conversationIDs) {
      const lastReadTime = new Date(userCursor[conversationID][username]).getTime();
      console.log("READ", new Date(userCursor[conversationID][username]));
      console.log("LOGIN", new Date(data.lastLoginTime));
      const messages = await this.messages
        .where("conversation")
        .equals(conversationID)
        .sortBy("createTime"); // 获取本地缓存中最新的一条消息
      const latestMessage = messages[messages.length - 1];
      const cursor = latestMessage?.createTime; // 以最新消息的时间戳作为游标

      let newMessages = await getMessages({ conversationID, cursor }, token); // 从服务器获取更新的消息列表
      let unreadCount = 0;

      const localMessages = await db.getMessagesFromDB(conversationID);
      unreadCount += localMessages.filter((message) => {
        return ((new Date(message.createTime).getTime() > lastReadTime) && message.sender !== username);
      }).length;

      newMessages = newMessages.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
      unreadCount += newMessages.filter((message) => {
        return ((new Date(message.createTime).getTime() > lastReadTime) && message.sender !== username);
      }).length;

      if (conversationID !== this.activeConversationId) {
        await this.conversations.update(conversationID, { unreadCount });
      }
      await this.messages.bulkPut(newMessages);
    }
  }

  // 清除会话的未读计数
  async clearUnreadCount(conversationID: string) {
    await this.conversations.update(conversationID, { unreadCount: 0 });
  }

  async incrementUnreadCount(conversationID: string) {
    const conversation = await this.conversations.get(conversationID);
    await this.conversations.update(conversationID, { unreadCount: (conversation?.unreadCount || 0) + 1});
    return conversation?.unreadCount;
  }

  // 根据游标获取本地缓存中的消息
  async getMessagesFromDB(conversationID: string) {
    const data = (await this.messages.toArray()).filter(message => {
      return message.conversation === conversationID;
    });
    return data;
  }
}

export const db = new CachedData(); // 创建CachedData实例