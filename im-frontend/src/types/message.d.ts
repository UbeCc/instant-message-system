interface Message {
    content: string;       // 消息内容
    sender: string;        // 发送者用户名
    create_time: Date;     // 消息创建时间
}

interface ConvMessage {
    conv_id: ObjectId;
    msg_list: Message[]
}

interface ConvMessageData {
    conv_id: ObjectId;
    message: Message;
}