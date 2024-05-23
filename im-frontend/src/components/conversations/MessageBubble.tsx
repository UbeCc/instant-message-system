import React from "react";
import { useState, useEffect } from "react";
import styles from "../../styles/MessageBubble.module.css";
import type { MenuProps } from "antd";
import { Avatar, Dropdown } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { BACKEND_URL, DELETE_MESSAGE_FAILED, DELETE_MESSAGE_SUCCESS, FAILURE_PREFIX } from "../../constants/string";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { db } from "../../api/db";
import { setLastUpdateTime } from "../../redux/auth";
import { useContext } from "react";
import { UserCursorContext } from "../../pages/_app";
import { BriefMsg, RefMessageContext } from "./HomePage";

export interface MessageBubbleProps {
  convID: string;
  msgID: string;
  sender: string; // 消息发送者
  content: string; // 消息内容
  createTime: Date; // 消息时间戳
  isMe: boolean; // 判断消息是否为当前用户发送
  isReferred: boolean;
  avatar: string; // 消息发送者的头像
}

// 消息气泡组件
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  sender,
  content,
  createTime,
  isMe,
  msgID,
  convID,
  isReferred,
  avatar,
}) => {
  const userCursor = useContext(UserCursorContext)?.userCursor;
  const token = useSelector((state:RootState) => state.auth.token);
  // const lastUpdateTime = useSelector((state: RootState) => state.auth.lastUpdateTime);
  const dispatch = useDispatch();
  // const refMessage = useContext(RefMessageContext)?.refMessage;
  const updateRefMessage = useContext(RefMessageContext)?.updateRefMessage;
  const [refCount, setRefCount] = useState<MenuProps["items"]>([]);
  const [myRefMes, setMyRefMes] = useState<MenuProps["items"]>([]);

  const [readUsers, setReadUsers] = useState<MenuProps["items"]>([]);
  useEffect(() => {
    let count = 0;
    const curReadUsers: string[] = [];
    if (userCursor !== undefined) {
      for (const [conversationID, userMap] of Object.entries(userCursor)) {
        if (conversationID === convID) {
          for (const [username, readTime] of Object.entries(userMap)) {
            if (new Date(readTime) >= new Date(createTime)) {
              count++;
              curReadUsers.push(username);
            }
          }
        }
      }
    }
    setReadUsers(curReadUsers.map((username) => {
      return {
        key: username,
        label: username
      };
    }));
  }, [userCursor]);

  const formattedTime = new Date(createTime).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const updateRefCount = async () => {
    const rawRefCount = await fetch(`${BACKEND_URL}/api/message/refer`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        convID: db.activeConversationId,
        msgID,
      }),
    });
    const curRefCount = await rawRefCount.json();
    setRefCount([{
      key: curRefCount.refCount,
      label: curRefCount.refCount,
    }]);
  };

  const updateMyRefMes = async () => {
    const rawRefCount = await fetch(`${BACKEND_URL}/api/message/refer`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        convID: db.activeConversationId,
        msgID,
      }),
    });
    const data = await rawRefCount.json();
    const curMsg = data.refMessage;
    let curContent = "无回复消息";
    if(curMsg) {
      curContent = `${curMsg.sender}: ${curMsg.content}`;
    }
    setMyRefMes([{
      key: curContent,
      label: curContent,
    }]);
  };


  const handleScroll = async (e: any) => {
    e.preventDefault();
    const rawRefMessage = await fetch(`${BACKEND_URL}/api/message/refer`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        convID: db.activeConversationId,
        msgID,
      }),
    });
    const curRefMessage = await rawRefMessage.json();
    if(curRefMessage) {
      const element = document.getElementById(`content-${curRefMessage.refMessage.msgID}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const toolItemList: MenuProps["items"] = [
    {
      key: "1",
      label: "回复消息",
      onClick: () => {
        const curRefMessage: BriefMsg = {
          msgID,
          content,
          sender,
        };
        if(updateRefMessage) updateRefMessage(curRefMessage);
      },
    },
    {
      key: "4",
      danger: true,
      label: "删除消息",
      onClick: async () => {
          fetch(`${BACKEND_URL}/api/message/delete`, {
            method: "DELETE",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                convID,
                msgID,
            }),
          })
          .then((res) => res.json())
          .then((res) => {
            if (Number(res.code) === 0) {
              alert(DELETE_MESSAGE_SUCCESS);
            } else {
              alert(DELETE_MESSAGE_FAILED);
            }
          })
          .catch((err) => alert(FAILURE_PREFIX + err));
          await db.messages.delete(msgID);
          dispatch(setLastUpdateTime(new Date().toString()));
      },
    },
  ];
  return (<>
      <div className={`${styles.container} ${isMe ? styles.me : styles.others}`}>
        {/* 根据消息发送者显示不同的气泡样式 */}
        <div className={styles.sender}>
          {sender} @ {formattedTime} {/* 显示发送者和消息时间 */}
        </div>
        {
          isMe ? <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div
              className={`${styles.bubble} ${
                isMe ? styles.meBubble : styles.othersBubble
              }`}
              style={{ marginRight: "8px" }} // 添加间距，使 Avatar 和 bubble 之间有一些空隙
            >
            <div className={`${isReferred && styles.referred}`}>
              <Dropdown menu={{ items: toolItemList }}>
                <a id={`content-${msgID}`} onClick={(e) => handleScroll(e)} style={{ fontSize: "16px" }}>
                  {content} {/* 显示消息内容 */}
                </a>
              </Dropdown>
            </div>
            </div>
            <Avatar src={avatar} />
          </div> : <div style={{ display: "flex", alignItems: "flex-start" }}>
            <Avatar src={avatar} />
            <div
              className={`${styles.bubble} ${
                isMe ? styles.meBubble : styles.othersBubble
              }`}
              style={{ marginLeft: "8px" }} // 添加间距，使 Avatar 和 bubble 之间有一些空隙
            >
              <div className={`${isReferred && styles.referred}`}>
              <Dropdown menu={{ items: toolItemList }}>
                <a id={`content-${msgID}`} onClick={(e) => e.preventDefault()} style={{ fontSize: "16px" }}>
                  {content} {/* 显示消息内容 */}
                </a>
              </Dropdown>
              </div>
            </div>
          </div>
        }
        <Dropdown menu={{ items: refCount }}>
          <a onClick={async (e) => { e.preventDefault();
            await updateRefCount(); }} style={{ fontSize: "14px" }}>
            被回复数
            <DownOutlined />
          </a>
        </Dropdown>

        <Dropdown menu={{ items: myRefMes }}>
          <a onClick={async (e) => { e.preventDefault();
            await updateMyRefMes(); }} style={{ fontSize: "14px" }}>
            回复消息内容
            <DownOutlined />
          </a>
        </Dropdown>

        <Dropdown menu={{ items: readUsers }}>
          <a onClick={(e) => e.preventDefault()} style={{ fontSize: "14px" }}>
            已读用户列表({readUsers?.length}人)
            <DownOutlined />
          </a>
        </Dropdown>
      </div>
  </>);
};

export default MessageBubble;