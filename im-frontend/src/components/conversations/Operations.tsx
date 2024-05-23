import React, { useState } from "react";
import { Button, Input, InputNumber, Select, message } from "antd";
import styles from "./Operations.module.css";

export interface OperationsProps {
  onSwitchUser: (username: string) => void, // 切换用户的回调函数
  onNewPrivateChat: (target: string) => void, // 创建新私聊的回调函数
  onNewGroupChat: (target: string[]) => void, // 创建新群聊的回调函数
  onJoinGroupChat: (chatId: number) => void, // 加入群聊的回调函数
  onLeaveGroupChat: (chatId: number) => void, // 退出群聊的回调函数
}

const { Option } = Select;

function checkUsername(value: string) {
  // 检查用户名是否符合规则：仅包含字母数字下划线且长度不超过20
  return value.match(/^\w*$/) && value.length <= 20;
}

// 操作面板组件
export const Operations: React.FC<OperationsProps> = ({
  onSwitchUser,
  onNewPrivateChat,
  onNewGroupChat,
  onJoinGroupChat,
  onLeaveGroupChat,
}) => {
  const [newUsername, setNewUsername] = useState<string>(""); // 新用户名
  const [newPrivateChatUser, setNewPrivateChatUser] = useState<string>(""); // 新私聊对象
  const [newGroupChatUsers, setNewGroupChatUsers] = useState<string[]>([]); // 新群聊成员列表
  const [chatToJoin, setChatToJoin] = useState<number>(); // 要加入的群聊ID
  const [chatToLeave, setChatToLeave] = useState<number>(); // 要退出的群聊ID

  return (
    <div>
      {/* 切换用户的操作界面 */}
      <Input.Group compact className={styles.inputItem}>
        <Input
          placeholder="切换身份"
          value={newUsername}
          onChange={(e) => {
            const { value } = e.target;
            if (checkUsername(value)) {
              setNewUsername(value);
            }
          }}
          onPressEnter={() => {
            if (newUsername) {
              onSwitchUser(newUsername);
            }
          }}
          maxLength={20}
          style={{ width: "calc(100% - 60px)" }}
        />
        <Button
          type="primary"
          disabled={!newUsername}
          onClick={() => {
            if (newUsername) {
              onSwitchUser(newUsername);
            }
          }}
          style={{ width: "60px" }}
        >
          切换
        </Button>
      </Input.Group>

      {/* 创建新私聊的操作界面 */}
      <Input.Group compact className={styles.inputItem}>
        <Input
          placeholder="创建私聊"
          value={newPrivateChatUser}
          onChange={(e) => {
            const { value } = e.target;
            if (checkUsername(value)) {
              setNewPrivateChatUser(value);
            }
          }}
          onPressEnter={() => {
            if (onNewPrivateChat) {
              onNewPrivateChat(newPrivateChatUser);
            }
          }}
          maxLength={20}
          style={{ width: "calc(100% - 60px)" }}
        />
        <Button
          type="primary"
          disabled={!newPrivateChatUser}
          onClick={() => {
            if (onNewPrivateChat) {
              onNewPrivateChat(newPrivateChatUser);
            }
          }}
          style={{ width: "60px" }}
        >
          私聊
        </Button>
      </Input.Group>

      {/* 创建新群聊的操作界面 */}
      <Input.Group compact className={styles.inputItem}>
        <Select
          mode="tags"
          maxTagCount={1}
          placeholder="创建群聊"
          value={newGroupChatUsers}
          onChange={(items) => {
            const validItems = items.filter((item) => checkUsername(item));
            if (items.length !== validItems.length) {
              message.warning("用户名不合法");
            }
            setNewGroupChatUsers(validItems);
          }}
          tokenSeparators={[","]}
          style={{ width: "calc(100% - 60px)" }}
        >
          {newGroupChatUsers.map((item) => (
            <Option key={item}>{item}</Option>
          ))}
        </Select>
        <Button
          type="primary"
          disabled={!newGroupChatUsers.length}
          onClick={() => {
            if (newGroupChatUsers.length > 0) {
              onNewGroupChat(newGroupChatUsers);
            }
          }}
          style={{ width: "60px" }}
        >
          建群
        </Button>
      </Input.Group>

      {/* 加入群聊的操作界面 */}
      <Input.Group compact className={styles.inputItem}>
        <InputNumber
          placeholder="输入群聊 ID"
          value={chatToJoin}
          min={1}
          onChange={(val) => {
            if (val) setChatToJoin(Number(val));
          }}
          onPressEnter={() => {
            if (chatToJoin) onJoinGroupChat(chatToJoin);
          }}
          style={{ width: "calc(100% - 60px)" }}
        />
        <Button
          type="primary"
          disabled={!chatToJoin}
          onClick={() => {
            if (chatToJoin) onJoinGroupChat(chatToJoin);
          }}
          style={{ width: "60px" }}
        >
          加群
        </Button>
      </Input.Group>

      {/* 退出群聊的操作界面 */}
      <Input.Group compact className={styles.inputItem}>
        <InputNumber
          placeholder="输入群聊 ID"
          value={chatToLeave}
          min={1}
          onChange={(val) => {
            if (val) setChatToLeave(Number(val));
          }}
          onPressEnter={() => {
            if (chatToLeave) onLeaveGroupChat(chatToLeave);
          }}
          style={{ width: "calc(100% - 60px)" }}
        />
        <Button
          type="primary"
          disabled={!chatToLeave}
          onClick={() => {
            if (chatToLeave) onLeaveGroupChat(chatToLeave);
          }}
          style={{ width: "60px" }}
        >
          退群
        </Button>
      </Input.Group>
    </div>
  );
};
