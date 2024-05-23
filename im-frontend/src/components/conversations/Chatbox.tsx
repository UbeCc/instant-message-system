import { UserCursorContext } from "../../pages/_app";
import React, { useEffect, useRef, useState, useContext } from "react";
import { Input, Button, Divider, Space, Modal, DatePicker, Avatar } from "antd";
import { useRequest } from "ahooks";
import styles from "../../styles/Chatbox.module.css";
import MessageBubble from "./MessageBubble";
import { Conversation, Message } from "../../api/types";
import { RootState } from "../../redux/store";
import { db } from "../../api/db";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import SearchRecordUI from "./SearchRecordUI";
import { RefMessageContext } from "./HomePage";
import { BACKEND_URL, FAILURE_PREFIX, GET_PROFILE_FAILED } from "../../constants/string";
export interface ChatboxProps {
  sendMessage: (text: string, friendOrGroup: string, type: string) => string; // 发送消息的函数
  conversation?: Conversation; // 当前选中的会话 (可能为空)
  avatar: string;
  lastUpdateTime?: string; // 本地消息数据最后更新时间，用于触发该组件数据更新
}

const Chatbox: React.FC<ChatboxProps> = ({
  sendMessage,
  conversation,
  lastUpdateTime,
  avatar,
}) => {
  const username = useSelector((state: RootState) => state.auth.name);
  const token = useSelector((state: RootState) => state.auth.token);
  const cachedMessagesRef = useRef<Message[]>([]); // 使用ref存储组件内缓存的消息列表
  const sending = false;
  // const [sending, setSending] = useState(false); // 控制发送按钮的状态
  const [inputValue, setInputValue] = useState(""); // 控制输入框的值
  const messageEndRef = useRef<HTMLDivElement>(null); // 指向消息列表末尾的引用，用于自动滚动
  const roomId = conversation?.id || ""; // 获取当前会话的ID
  const router = useRouter();
  const receivedMsgIds = useContext(UserCursorContext)?.receivedMsgIds;

  // 使用ahooks的useRequest钩子从IndexedDB异步获取消息数据，依赖项为lastUpdateTime
  const { data: messages } = useRequest(
    async () => {
      if (!conversation) return [];
      const curMessages = cachedMessagesRef.current;
      let newMessages = await db.getMessagesFromDB(conversation.id); // 从本地数据库获取当前会话的所有消息
      newMessages = newMessages.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
      cachedMessagesRef.current = newMessages;
      // 设置定时器以确保滚动操作在数据更新后执行
      setTimeout(function () {
        messageEndRef.current?.scrollIntoView({
            behavior: curMessages.length > 0 ? "smooth" : "instant",
        });
      }, 10);
      return cachedMessagesRef.current; // 返回更新后的消息列表
    },
    { refreshDeps: [conversation, lastUpdateTime] }
  );

  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setToggler(!toggler);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const refMsgID = useContext(RefMessageContext)?.refMessage;
  const updateRefMsgID = useContext(RefMessageContext)?.updateRefMessage;
  const [searchContent, setSearchContent] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [searchStartTime, setSearchStartTime] = useState("");
  const [searchEndTime, setSearchEndTime] = useState("");
  const [toggler, setToggler] = useState(false);
  const [userDataMap, setUserDataMap] = useState<Map<string, string>>(new Map<string, string>()); // Map<username, avatar>

  const fetchUserData = async (name: string) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/user/${name}`, {
            method: "GET",
            headers: {
                Authorization: token,
            },
        });
        const data = await response.json();
        if (Number(data.code) === 0) {
            setUserDataMap((prev) => new Map(prev.set(name, data.user.avatar)));
        } else {
            alert(GET_PROFILE_FAILED);
        }
    } catch (error) {
        alert(FAILURE_PREFIX + error);
    }
  };

  useEffect(() => {
    const requireUsersSet = new Set(messages?.map((item) => item.sender) || []);
    const requireUsers = Array.from(requireUsersSet); // 将 Set 转换为数组
    requireUsers.forEach((item) => {
        fetchUserData(item);
    });
  }, [messages]);

  const onSendMessage = async (e: any) => {
    if (!conversation) return;
    // 禁止发送空消息
    if (inputValue.trim().length === 0) {
      alert("禁止发送空消息！");
      setInputValue("");
      return;
    }
    // 按下Enter键时发送消息，除非同时按下了Shift或Ctrl
    if (!e.shiftKey && !e.ctrlKey) {
      e.preventDefault(); // 阻止默认事件
      e.stopPropagation(); // 阻止事件冒泡
      await db.clearUnreadCount(conversation.id);

      const msgID: string = sendMessage(inputValue, roomId, conversation.type); // 调用发送消息函数
      setInputValue("");

      setTimeout(() => {
        // 如果在10秒内没有找到刚发的消息，则认为发送失败
        if (receivedMsgIds && receivedMsgIds.indexOf(msgID) === -1) {
          // 从本地数据库中找到刚发的消息
          const sendMessage = cachedMessagesRef.current.find((message) => message.id === msgID);
          // 更新发送状态，把这条消息的内容前加上 <发送失败>
          if (sendMessage) sendMessage.content = "<发送失败> " + sendMessage.content;
          console.log("发送消息失败");
        }
      }, 1000 * 10); // 10秒
    }
  };


  return (
    <div className={styles.container}>
      {conversation && (
        <>
          <div className={styles.title} style={{ fontSize: 20 }}>
            <Space>
              <Avatar src={avatar} />
              <Button
                type="link"
                onClick={() => {
                  conversation.type === "private_chat" ? router.push(`/user?username=${conversation.name}`) :
                  router.push(`/group?groupID=${conversation.id}`);
                }}
                style={{ color: "#1677ff", fontSize: "20px" }}
              >
                {conversation.name}
              </Button>
              <Button onClick={showModal}>查找消息记录</Button>
              <Button onClick={() => updateRefMsgID && updateRefMsgID(undefined)}>清除引用</Button>
              <Modal title="查找消息记录" open={isModalOpen}
                onOk={handleOk} onCancel={handleCancel}
                okText="搜索" cancelText="关闭"
                width={800}
              >
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <DatePicker.RangePicker onChange={(_, dateStrings) => {
                    setSearchStartTime(dateStrings[0]);
                    setSearchEndTime(dateStrings[1]);
                  }} allowClear/>
                  <Input placeholder="查找用户名" allowClear onChange={(e) => {setSearchUsername(e.target.value);}} style={{ width: 250 }} />
                  <Input placeholder="查找内容" allowClear onChange={(e) => {setSearchContent(e.target.value);}} style={{ width: 250 }} />
                </div>
                <p>日期区间为左开右闭；留空以查找全部</p>
                <SearchRecordUI convID={conversation.id} toggle={toggler} content={searchContent} startTime={searchStartTime} finishTime={searchEndTime} sender={searchUsername} />
              </Modal>
            </Space>
          </div>
          <Divider className={styles.divider} />
        </>
      )}

      <div className={styles.messages}>
        {/* 消息列表容器 */}
        {messages?.map((item) => (
          <MessageBubble key={item.id} isReferred={refMsgID?.msgID === item.id} convID={item.conversation} msgID={item.id} isMe={item.sender === username} {...item} avatar={userDataMap.get(item.sender) as string}/> // 渲染每条消息为MessageBubble组件
        ))}
        <div ref={messageEndRef} /> {/* 用于自动滚动到消息列表底部的空div */}
      </div>
      {conversation && (
        <>
          <Input.TextArea
            className={styles.input}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={(e) => onSendMessage(e)} // 按下Enter键时发送消息
            rows={3}
            autoSize={false} // 关闭自动调整大小
            readOnly={sending} // 当正在发送消息时，设置输入框为只读
          />
          <Button
            className={styles.submitButton}
            type="primary"
            disabled={sending} // 当正在发送消息时，禁用按钮
            loading={sending} // 显示加载中状态
            onClick={(e) => onSendMessage(e)} // 点击时调用发送消息函数
          >
            发送
            <br />
            (Enter)
          </Button>
        </>
      )}
    </div>
  );
};

export default Chatbox;