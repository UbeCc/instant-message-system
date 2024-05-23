import React from "react";
import { List, Avatar, Badge } from "antd";
import styles from "../../styles/ConversationSelection.module.css";
import { Conversation } from "../../api/types";
import { getConversationDisplayName } from "../../api/utils";

interface ConversationSelectionProps {
  conversations: Conversation[]; // 会话列表
  onSelect: (conversationID: string) => void; // 选择会话时的回调函数
  map: Map<string, string>; // 会话ID到头像URL的映射
}

const ConversationSelection: React.FC<ConversationSelectionProps> = ({ conversations, onSelect, map }) => {
  return (
    <List
      itemLayout="horizontal"
      dataSource={conversations} // 数据源为当前用户的会话列表
      renderItem={(item) => (
        <List.Item
          onClick={() => onSelect(item.id)} // 点击会话项时触发onSelect回调, 设置激活回话为这个item的id
          className={styles.listItem}
        >
          <List.Item.Meta
            className={styles.listItemMeta}
            avatar={
              // 会话项的头像，根据会话类型显示不同图标
              <Badge count={item.unreadCount || 0}>
                <Avatar src={map.get(item.id) || ""}/>
              </Badge>
            }
            title={getConversationDisplayName(item)}
            description={
              // 会话描述部分显示最近消息的发送者和内容
              // TODO
              ""
            }
          />
        </List.Item>
      )}
    />
  );
};

export default ConversationSelection;
