import { ObjectId, Db } from "mongodb";
import { connectToDatabase, closeDatabaseConnection } from "./database";

export interface BriefMsg {
    msgID: string;
    content: string;
    sender: string;
}

export interface Message {
    _id: string;
    content: string;       // 消息内容
    sender: string;        // 发送者用户名
    createTime: Date;      // 消息创建时间
    refCount: number;      // 消息引用次数
    refMessage: BriefMsg | null;  // 消息引用消息
}

export interface ConvMessage {
    _id: ObjectId;
    conv_id: ObjectId;
    msg_list: Message[];
}

export interface ConvMessageData {
    conv_id: ObjectId;
    message: Message;
}

class ConvMessageModel {
    private db!: Db;

    /**
     * @summary 初始化数据库连接
     */
    async init() {
        this.db = await connectToDatabase();
    }

    /**
     * @summary 创建新的会话消息列表
     * @param {ObjectId} convID - 会话 ID
     */
    async createConvMessage(convID: ObjectId): Promise<boolean> {
        try {
            const convMessageCollection = this.db.collection("convMessage");
            const newConvMessage = {
                conv_id: new ObjectId(convID),
                msg_list: []
            };
            await convMessageCollection.insertOne(newConvMessage);
            return true;
        } catch (err) {
            console.error("Creating conversation message list failed.", err);
            return false;
        }
    }

    /**
     * @summary 在指定会话创建新的消息
     * @param {ConvMessageData} message - 消息数据
     */
    async createMessage(message: ConvMessageData) {
        try {
            const conv_id = message.conv_id;
            const convMessageCollection = this.db.collection("convMessage");
            const convMessage = await convMessageCollection.findOne<{ msg_list: Message[] }>({conv_id});
            if (!convMessage) {
                throw new Error("Conversation message list not found.");
            } else {
                convMessage.msg_list.push(message.message);
                await convMessageCollection.updateOne({conv_id: new ObjectId(message.conv_id)}, {$set: {msg_list: convMessage?.msg_list}});
                return true;
            }
        } catch (err) {
            console.error("Creating message failed.", err);
            return false;
        }
    }

    /**
     * @summary 获取全量历史消息
     * @param {Object} convID - 会话 ID
     * @returns {Message[] | boolean} 若查找成功则返回 Message 数组，否则返回 false
     */
    async getFullMessage(username: string, convID: ObjectId): Promise<Message[]> {
        try {
            const convMessageCollection = this.db.collection("convMessage");
            const convMessage = await convMessageCollection.findOne<{ msg_list: Message[] }>({conv_id: convID});

            // 获取删除信息列表
            const friendshipCollection = this.db.collection("friendship");
            const groupMemberCollection = this.db.collection("groupMember");
            const sender = await friendshipCollection.findOne<{ senderDeleteList: string[] }>({_id: convID, sender: username});
            const receiver = await friendshipCollection.findOne<{ receiverDeleteList: string[] }>({_id: convID, receiver: username});
            const groupMember = await groupMemberCollection.findOne<{ deleteList: string[] }>({groupID: convID, username});
            const rawDeleteList = receiver ? receiver.receiverDeleteList : groupMember?.deleteList;
            const deleteList = sender ? sender.senderDeleteList : rawDeleteList;
            if (!convMessage || !deleteList) {
                throw new Error("The conversation doesn't exist.");
            } else {
                return convMessage.msg_list.filter(msg =>
                    // 首先检查 msg 的 ID 不在 deleteList 中
                    !new Set(deleteList).has(msg._id.toString())
                );
            }
        } catch (error) {
            console.error(`Error Getting Full Message List In Model. ${error}`, error);
            throw new Error(`Error Getting Full Message List In Model. ${error}`);
        }
    }

    /**
     * @summary 获取指定会话的某条信息引用数
     * @param {string} username - 用户名称
     * @param {ObjectId} convID - 会话 ID
     * @param {ObjectId} msgID - 消息 ID
     * @returns {number} 引用数
     */
    async getRefMessage(convID: ObjectId, msgID: string) {
        try {
            const convMessageCollection = this.db.collection("convMessage");
            const convMessage = await convMessageCollection.findOne<{ msg_list: Message[] }>({conv_id: convID});
            const msg = convMessage?.msg_list.find(msg => msg._id === msgID);
            if (!msg) {
                throw new Error("The message doesn't exist.");
            } else {
                return {
                    refCount: msg.refCount,
                    refMessage: msg.refMessage
                };
            }
        } catch (error) {
            console.error(`Error Getting Message Reference Count In Model. ${error}`, error);
            throw new Error(`Error Getting Message Reference Count In Model. ${error}`);
        }
    }

    /**
     * @summary 获取指定时间段的历史消息
     * @param {Object} convID - 会话 ID
     * @param {Date} startTime - 起始时间
     * @param {Date} finishTime - 终止时间
     * @returns {Message[] | boolean} 若查找成功则返回 Message 数组，否则返回 false
     */
    async getMessageByTime(username: string, convID: ObjectId, startTime: Date, finishTime: Date): Promise<Message[]> {
        try {
            const convMessageCollection = this.db.collection("convMessage");
            const convMessage = await convMessageCollection.findOne<{ msg_list: Message[] }>({conv_id: convID});

            // 获取删除信息列表
            const friendshipCollection = this.db.collection("friendship");
            const groupMemberCollection = this.db.collection("groupMember");
            const sender = await friendshipCollection.findOne<{ senderDeleteList: string[] }>({_id: convID, sender: username});
            const receiver = await friendshipCollection.findOne<{ receiverDeleteList: string[] }>({_id: convID, receiver: username});
            const groupMember = await groupMemberCollection.findOne<{ deleteList: string[] }>({groupID: convID, username});
            const rawDeleteList = receiver ? receiver.receiverDeleteList : groupMember?.deleteList;
            const deleteList = sender ? sender.senderDeleteList : rawDeleteList;
            if (!convMessage || !deleteList) {
                throw new Error("The conversation doesn't exist.");
            } else {
                return convMessage.msg_list.filter(msg => {
                    // 首先检查 msg 的 ID 不在 deleteList 中
                    if (!deleteList.includes(msg._id.toString())) {
                        // 然后检查 msg 的 content 是否等于 content
                        const time = new Date(msg.createTime);
                        const result = time >= startTime && time <= finishTime;
                        return result;
                    }
                    // 如果 ID 在 deleteList 中，则不包含在 filteredList 中
                    return false;
                });
            }
        } catch (error) {
            console.error(`Error Getting Message List By Time In Model. ${error}`, error);
            throw new Error(`Error Getting Message List By Time In Model. ${error}`);
        }
    }

    /**
     * @summary 获取指定发送者的历史消息
     * @param {Object} convID - 会话 ID
     * @param {Date} sender - 发送者用户名称
     * @returns {Message[] | boolean} 若查找成功则返回 Message 数组，否则返回 false
     */
    async getMessageBySender(username: string, convID: ObjectId, senderName: string): Promise<Message[]> {
        try {
            const convMessageCollection = this.db.collection("convMessage");
            const convMessage = await convMessageCollection.findOne<{ msg_list: Message[] }>({conv_id: convID});

            // 获取删除信息列表
            const friendshipCollection = this.db.collection("friendship");
            const groupMemberCollection = this.db.collection("groupMember");
            const sender = await friendshipCollection.findOne<{ senderDeleteList: string[] }>({_id: convID, sender: username});
            const receiver = await friendshipCollection.findOne<{ receiverDeleteList: string[] }>({_id: convID, receiver: username});
            const groupMember = await groupMemberCollection.findOne<{ deleteList: string[] }>({groupID: convID, username});
            const rawDeleteList = receiver ? receiver.receiverDeleteList : groupMember?.deleteList;
            const deleteList = sender ? sender.senderDeleteList : rawDeleteList;
            if (!convMessage || !deleteList) {
                throw new Error("The conversation doesn't exist.");
            } else {
                return convMessage.msg_list.filter(msg => {
                        // 首先检查 msg 的 ID 不在 deleteList 中
                        if (!deleteList.includes(msg._id.toString())) {
                            // 然后检查 msg 的 content 是否等于 content
                            return msg.sender === senderName;
                        }
                        // 如果 ID 在 deleteList 中，则不包含在 filteredList 中
                        return false;
                    }
                );
            }
        } catch (error) {
            console.error(`Error Getting Message List By Sender In Model. ${error}`, error);
            throw new Error(`Error Getting Message List By Sender In Model. ${error}`);
        }
    }

    /**
     * @summary 获取指定消息内容的历史消息
     * @param {Object} convID - 会话 ID
     * @param {Date} content - 消息内容
     * @returns {Message[] | boolean} 若查找成功则返回 Message 数组，否则返回 false
     */
    async getMessageByContent(username: string, convID: ObjectId, content: string): Promise<Message[]> {
        try {
            const convMessageCollection = this.db.collection("convMessage");
            const convMessage = await convMessageCollection.findOne<{ msg_list: Message[] }>({conv_id: convID});

            // 获取删除信息列表
            const friendshipCollection = this.db.collection("friendship");
            const groupMemberCollection = this.db.collection("groupMember");
            const sender = await friendshipCollection.findOne<{ senderDeleteList: string[] }>({_id: convID, sender: username});
            const receiver = await friendshipCollection.findOne<{ receiverDeleteList: string[] }>({_id: convID, receiver: username});
            const groupMember = await groupMemberCollection.findOne<{ deleteList: string[] }>({groupID: convID, username});
            const rawDeleteList = receiver ? receiver.receiverDeleteList : groupMember?.deleteList;
            const deleteList = sender ? sender.senderDeleteList : rawDeleteList;
            if (!convMessage || !deleteList) {
                throw new Error("The conversation doesn't exist.");
            } else {
                return convMessage.msg_list.filter((msg) => {
                    // 首先检查 msg 的 ID 不在 deleteList 中
                    if (!deleteList.includes(msg._id.toString())) {
                        // 然后检查 msg 的 content 是否等于 content
                        return msg.content === content;
                    }
                    // 如果 ID 在 deleteList 中，则不包含在 filteredList 中
                    return false;
                });
            }
        } catch (error) {
            console.error(`Error Getting Message List By Content In Model. ${error}`, error);
            throw new Error(`Error Getting Message List By Content In Model. ${error}`);
        }
    }

    /**
     * @summary 在指定会话创建新的消息
     * @param {ConvMessageData} messageData - 消息数据
     */
    async deleteMessage(username: string, msgID: string, convID: ObjectId) {
        try {
            const friendshipCollection = this.db.collection("friendship");
            const groupMemberCollection = this.db.collection("groupMember");
            const sender = await friendshipCollection.findOne<{ senderDeleteList: string[] }>({_id: convID, sender: username});
            const receiver = await friendshipCollection.findOne<{ receiverDeleteList: string[] }>({_id: convID, receiver: username});
            const groupMember = await groupMemberCollection.findOne<{ deleteList: string[] }>({groupID: convID, username});
            if (sender) {
                sender.senderDeleteList.push(msgID.toString());
                await friendshipCollection.updateOne({_id: convID, sender: username}, {$set: { senderDeleteList: sender.senderDeleteList }});
            } else if (receiver) {
                receiver.receiverDeleteList.push(msgID.toString());
                await friendshipCollection.updateOne({_id: convID, receiver: username}, {$set: { receiverDeleteList: receiver.receiverDeleteList }});
            } else if (groupMember) {
                groupMember.deleteList.push(msgID.toString());
                await groupMemberCollection.updateOne({groupID: convID, username}, {$set: { deleteList: groupMember.deleteList }});
            } else {
                throw new Error("Delete list not found.");
            }
        } catch (error) {
            console.error(`Error Deleteing Message In Model. ${error}`, error);
            throw new Error(`Error Deleteing Message In Model. ${error}`);
        }
    }

    /**
     * @summary 引用消息
     * @param {string} msgID - 被引用消息的 ID
     * @param {string} sender - 发送者用户名称
     * @param {string} content - 消息内容
     */
        async refMessage(convID: ObjectId, msgID: string) {
            try {
                const convMessageCollection = this.db.collection("convMessage");
                // 被引用消息的引用计数加 1
                const options = {
                    projection: { "msg_list.$": 1 },
                    includeResultMetadata: true
                };
                const result = await convMessageCollection.findOneAndUpdate(
                    { "conv_id": new ObjectId(convID), "msg_list._id": msgID }, // 查询条件
                    { $inc: { "msg_list.$.refCount": 1 } }, // 更新操作，$inc为递增操作符，$ 用来定位数组中的特定元素
                    options // 返回文档的元数据
                );
                if (result && !result.value) {
                    console.log("Message not found or convID not matched.");
                    return false;
                } else {
                    console.log("RefCount incremented successfully.");
                    return true;
                }
            } catch (error) {
                console.error(`Error refMessage In Model. ${error}`, error);
                throw new Error(`Error refMessage In Model. ${error}`);
            }
        }

    /**
     * @summary 关闭数据库连接
     */
    async close() {
        await closeDatabaseConnection();
    }
}
const convMessageModel = new ConvMessageModel();
export { convMessageModel };
export default ConvMessageModel;