import WebSocketContext from "../../contexts/WebSocketContext";
import React, { useCallback, useEffect, useState } from "react";
import { FriendData, GroupData } from "../../types/userinfo";
import { useLocalStorageState, useRequest } from "ahooks";
import styles from "../../styles/HomePage.module.css";
import Chatbox from "./Chatbox";
import { getFriends, getGroups } from "../../utils/fetch";
import { useDispatch } from "react-redux";
import { UserCursorContext } from "../../pages/_app";
import { setLastUpdateTime } from "../../redux/auth";
import { RootState } from "../../redux/store";
import { db } from "../../api/db";
import ConversationSelection from "./ConversationSelection";
import { useSelector } from "react-redux";
import { useContext } from "react";
import { ObjectId } from "bson";
import { createContext } from "react";
import { BACKEND_URL } from "../../constants/string";
import { useRouter } from "next/router";

export interface Message {
  id: string;
  content: string;
  sender: string;
  createTime: Date;
  conversation: string;
  refMessage: BriefMsg | undefined;
}

export interface BriefMsg {
  msgID: string;
  content: string;
  sender: string;
}

interface RefMessageContextType {
  refMessage: BriefMsg | undefined;
  updateRefMessage: (curRefMessage: BriefMsg | undefined) => void;
}

export const RefMessageContext = createContext<RefMessageContextType | undefined>(undefined);

const HomePage = () => {

  const userCursor = useContext(UserCursorContext)?.userCursor;
  const updateUserCursor = useContext(UserCursorContext)?.updateUserCursor;

  const [conversationAvatarMap, setConversationAvatarMap] = useState<Map<string, string>>(new Map<string, string>());
  // Map<conversationID, avatar>

  const dispatch = useDispatch();
  const lastUpdateTime = useSelector((state: RootState) => state.auth.lastUpdateTime);
  const socket = useContext(WebSocketContext);
  const router = useRouter();

  useEffect(() => {
    if (socket === undefined) {
      router.replace("/");
    }
  }, [socket]);

  const token = useSelector((state: RootState) => state.auth.token);
  const username = useSelector((state: RootState) => state.auth.name);
  const [refMessage, updateRefMessage] = useState<BriefMsg | undefined>(undefined);
  const [activeChat, setActiveChat] = useLocalStorageState<string | null>(
    "activeChat",
    { defaultValue: null }
  );
  const [friends, setFriends] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);

  const fetchFriends = async () => {
    const friendsResponse = await getFriends(token);
    const curFriends = friendsResponse.map((friend: FriendData) => friend.username);
    setFriends(curFriends);
  };

  const fetchGroups = async () => {
    const groupsResponse = await getGroups(token);
    const curGroups = groupsResponse.map((group: GroupData) => group.groupID);
    setGroups(curGroups);
  };

  useEffect(() => {
    fetchFriends();
    fetchGroups();
    db.initConversations(token, username);
  }, []);

  useEffect(() => {
    if (socket === undefined) {
      return;
    }
    dispatch(setLastUpdateTime(new Date().toString()));

    friends.forEach((friend) => {
      socket.emit("join private_chat", friend);
    });

    groups.forEach((group) => {
      socket.emit("join group_chat", group);
    });
  }, [friends, groups]);

  const sendMessage = (text: string, friendOrGroup: string, type: string) => {
    if (socket === undefined) {
      return "";
    }
    const createTime = new Date();
    const ref = refMessage !== undefined;
    const message = {
      id: new ObjectId().toString(),
      content: text,
      sender: username,
      conversation: friendOrGroup,
      createTime,
      refMessage,
    };
    socket.emit(type, message, ref);
    socket.emit("update_my_cursor", new Date());
    db.addMessage(message);
    dispatch(setLastUpdateTime(new Date().toString()));
    refresh();
    return message.id;
  };

  useEffect(() => {
    refresh();
  }, [lastUpdateTime, userCursor]);

  // 从本地数据库拉取当前用户会话列表
  const { data: conversations, refresh } = useRequest(async () => {
    const convs = await db.conversations.toArray();
    const filteredConvs = convs.filter((conv) => conv.members.includes(username));
    return filteredConvs;
  });

  // 更新函数，从后端拉取消息，合并到本地数据库
  const update = useCallback(() => {
    refresh();
  }, [username, refresh]);
  useEffect(() => {
    update();
  }, [update]);

  useEffect(() => {
    if (socket === undefined) {
      return;
    }
    if(db.activeConversationId) db.clearUnreadCount(db.activeConversationId);
    db.activeConversationId = activeChat || null;
    socket.emit("update_my_cursor", new Date());
    if (activeChat) {
      db.clearUnreadCount(activeChat).then(refresh);
    }
  }, [activeChat, refresh]);

  // 获得头像
  const getAvatars = async () => {
    const response = await fetch(`${BACKEND_URL}/api/list/conversation`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `${token}`,
      },
    });
    const data = await response.json();
    for (let i = 0; i < data.avatars.length; i++) {
      setConversationAvatarMap((prev) => new Map(prev.set(data.conversationIDs[i], data.avatars[i])));
    }
  };

  useEffect(() => {
    getAvatars();
  }, []);

  return (
    <RefMessageContext.Provider value={{ refMessage, updateRefMessage }}>
        <div className={styles.container}>
          <div className={styles.settings}>
            <div className={styles.conversations}>
              <ConversationSelection // 会话选择组件
                conversations={conversations || []}
                onSelect={async (id) => {
                  if (socket === undefined) {
                    return;
                  }
                  socket.emit("update_read_cursor", id, new Date());
                  setActiveChat(id);
                  const newCursor = userCursor || {};
                  if (newCursor[id] === undefined) {
                    newCursor[id] = {};
                  }
                  console.log("HOMEID", id);
                  const time = new Date();
                  newCursor[id][username] = time;
                  await db.clearUnreadCount(id);
                  updateUserCursor && await updateUserCursor(newCursor);
                }}
                map={conversationAvatarMap}
              />
            </div>
          </div>
          <div className={styles.chatBox}>
            <Chatbox // 聊天框组件
              sendMessage={sendMessage}
              conversation={
                // 根据活跃会话ID找到对应的会话对象
                activeChat
                  ? conversations?.find((item) => item.id === activeChat)
                  : undefined
              }
            // TODO: 这里的avatar应该是会话的头像
            avatar={conversationAvatarMap.get(activeChat || "") as string}
            lastUpdateTime={lastUpdateTime}
            />
          </div>
        </div>
    </RefMessageContext.Provider>
  );
};

export default HomePage;
