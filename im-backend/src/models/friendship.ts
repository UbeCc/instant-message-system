import { ObjectId, Db } from "mongodb";
import { connectToDatabase, closeDatabaseConnection } from "./database";

export interface Friendship {
    _id: ObjectId;
    sender: string;      // 好友关系发起者
    receiver: string;    // 好友关系接收者
    createTime: Date;   // 好友关系创建时间
    senderTag: string;   // sender 在 receiver 中的分组
    receiverTag: string; // receiver 在 sender 中的分组
    senderDeleteList: string[];
    receiverDeleteList: string[];
    senderCursor: Date;
    receiverCursor: Date;
}

export interface FriendshipData {
    sender: string;
    receiver: string;
}

export interface FriendData {
    username: string,
    nickname: string,
    avatar: string
}

class FriendshipModel {
    private db!: Db;
    /**
     * @summary 初始化数据库连接
     */
    async init() {
        this.db = await connectToDatabase();
    }

    async updateConvCursor(username: string, cursor: Date, id: string) {
        const friendshipsCollection = this.db.collection("friendship");
        const friendship = await friendshipsCollection.findOne({ _id: new ObjectId(id) });
        if (friendship) {
            if (friendship.sender === username) {
                await friendshipsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { senderCursor: cursor } });
            } else {
                await friendshipsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { receiverCursor: cursor } });
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * @summary 修改当前用户所有好友的对应cursor
     */
    async updateCursor(username: string, cursor: Date) {
        const friendshipsCollection = this.db.collection("friendship");
        await friendshipsCollection.updateMany({ sender: username }, { $set: { senderCursor: cursor } });
        await friendshipsCollection.updateMany({ receiver: username }, { $set: { receiverCursor: cursor } });
    }

    /**
     * @summary 根据好友ID和自己的用户名获取好友用户名
     */
    async getFriendUsername(username: string, friendID: string) {
        const friendshipsCollection = this.db.collection("friendship");
        const friendship = await friendshipsCollection.findOne({ _id: new ObjectId(friendID) });
        if (friendship) {
            return friendship.sender === username ? friendship.receiver : friendship.sender;
        }
        return null;
    }

    /**
     * @summary 将新的好友关系存入数据库并返回相关信息
     * @param {FriendshipData} friendship - 好友关系
     */
    async createFriendship(friendship: FriendshipData): Promise<Friendship> {
        const friendshipsCollection = this.db.collection("friendship");
        const convMessageCollection = this.db.collection("convMessage");

        const friendship1 = await friendshipsCollection.findOne({ sender: friendship.sender, receiver: friendship.receiver });
        const friendship2 = await friendshipsCollection.findOne({ sender: friendship.receiver, receiver: friendship.sender });
        if (friendship1 || friendship2) {
            throw new Error("Friendship already exists.");
        }
        const time = new Date();
        const newFriendship = { ...friendship, createTime: time, senderCursor: time, receiverCursor: time,
            senderTag: "", receiverTag: "", senderDeleteList: [], receiverDeleteList: []};
        const result = await friendshipsCollection.insertOne(newFriendship);

        const newConvMessage = {
            conv_id: result.insertedId,
            msg_list: []
        };
        await convMessageCollection.insertOne(newConvMessage);

        return { ...newFriendship, _id: result.insertedId, senderCursor: time, receiverCursor: time };
    }

    /**
     * @summary 根据用户名称获得好友名称列表
     * @param {string} username - 用户名称
     * @returns 好友信息数组
     */
    async getFriendsByUsername(username: string) {
        const usersCollection = this.db.collection("user");
        const friendshipsCollection = this.db.collection("friendship");

        const senders = await friendshipsCollection.find<{ sender: string; receiver: string, senderCursor: Date, receiverCursor: Date,
            _id: string, receiverTag: string, senderTag: string }>({ receiver: username }).toArray();
        const receivers = await friendshipsCollection.find<{ sender: string; receiver: string, senderCursor: Date, receiverCursor: Date,
            _id: string, receiverTag: string, senderTag: string }>({ sender: username }).toArray();

        const cursors: Date[] = [];
        const friendCursors: Date[] = [];

        const senderName = senders.map((friendship) => {
            cursors.push(friendship.receiverCursor); // 当前用户是待查找用户方的接收者
            friendCursors.push(friendship.senderCursor);
            return {
                username: friendship.sender,
                id: friendship._id.toString(),
            };
        });

        const receiverName = receivers.map((friendship) => {
            cursors.push(friendship.senderCursor); // 当前用户是待查找用户方的发送者
            friendCursors.push(friendship.receiverCursor);
            return {
                username: friendship.receiver,
                id: friendship._id.toString(),
            };
        });

        const friendName = senderName.concat(receiverName);

        const friends = await usersCollection.aggregate([
            {
                $match: { username: { $in: friendName.map((e) => e.username) } }
            }
        ]).toArray();

        const senderTag = senders.map((friendship) => friendship.senderTag);
        const receiverTag = receivers.map((friendship) => friendship.receiverTag);
        const friendTag = senderTag.concat(receiverTag);
        console.log(cursors, friendCursors);
        return friends.map((friend, index) => ({
            username: friend.username,
            nickname: friend.nickname,
            avatar: friend.avatar,
            id: friendName.find((e) => e.username === friend.username)?.id,
            tag: friendTag[index],
            cursor: cursors[index],
            friendCursor: friendCursors[index]
        }));
    }

    /**
     * @summary 检查好友关系是否已经存在，根据用户名获取好友关系 ID
     * @param {string} username - 用户名称
     * @param {string} friendname - 好友名称
     * @returns {string | null} 好友关系 ID 或 null
     */
    async checkFriendshipExists(username: string, friendname: string) {
        const friendshipsCollection = this.db.collection("friendship");
        try {
            const sender = await friendshipsCollection.findOne({ sender: username, receiver: friendname });
            const receiver = await friendshipsCollection.findOne({ sender: friendname, receiver: username });
            if (sender) {
                return {
                    friendshipID: sender._id.toString(),
                    tag: sender.receiverTag
                };
            } else if (receiver) {
                return {
                    friendshipID: receiver._id.toString(),
                    tag: receiver.receiverTag
                };
            } else {
                return {
                    friendshipID: "",
                    tag: null
                };
            }
        } catch (error) {
            console.error(`Error Checking Friendship. ${error}`, error);
            throw new Error(`Error Checking Friendship. ${error}`);
        }
    }

    /**
     * @summary 修改好友分组
     * @param {string} username - 用户名称
     * @param {string} friendname - 好友名称
     * @returns {boolean} true 表示修改成功
     */
    async editTag(username: string, friendname: string, tag: string): Promise<void> {
        const friendshipsCollection = this.db.collection("friendship");
        try {
            // 自己作为 sender
            const sender = await friendshipsCollection.findOne({ sender: username, receiver: friendname });
            // 自己作为 receiver
            const receiver = await friendshipsCollection.findOne({ sender: friendname, receiver: username });
            if (sender) {
                await friendshipsCollection.updateOne({ sender: username, receiver: friendname }, { $set: { receiverTag: tag } });
                return;
            } else if (receiver) {
                await friendshipsCollection.updateOne({ receiver: username, sender: friendname }, { $set: { senderTag: tag } });
                return;
            }
            throw new Error("They are not Friends!");
        } catch (error) {
            console.error(`Error Editing Friend Tag:. ${error}`, error);
            throw new Error(`Error Editing Friend Tag:. ${error}`);
        }
    }

    /**
     * @summary 删除好友关系
     * @param {string} username - 用户名称
     * @param {string} friendname - 好友名称
     */
    async deleteFriendship(username: string, friendname: string): Promise<boolean> {
        const friendshipsCollection = this.db.collection("friendship");
        try {
            const sender = await friendshipsCollection.findOne({ sender: username, receiver: friendname });
            const receiver = await friendshipsCollection.findOne({ sender: friendname, receiver: username });
            if (sender) {
                await friendshipsCollection.deleteOne({ sender: sender.sender, receiver: sender.receiver });
                return true;
            } else if (receiver) {
                await friendshipsCollection.deleteOne({ sender: receiver.sender, receiver: receiver.receiver });
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error("Error deleting friendship:", error);
            throw new Error(`Error deleting friendship. ${error}`);
        }
    }

    /**
     * @summary 关闭数据库连接
     */
    async close() {
        await closeDatabaseConnection();
    }
}
const friendshipModel = new FriendshipModel();

export default FriendshipModel;
export { friendshipModel };
