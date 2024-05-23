import { ObjectId, Db } from "mongodb";
import { connectToDatabase, closeDatabaseConnection } from "./database";
import FriendshipModel from "./friendship";

export interface FriendshipApplication {
    _id: ObjectId;
    sender: string;      // 好友关系发起者
    receiver: string;    // 好友关系接收者
    message: string;     // 好友关系申请理由
    createTime: Date;   // 好友关系申请时间
    reject_reason: string;    // 拒绝理由
    status: string;          // 申请状态: pending, accepted or rejected
}

export interface ApplicationData {
    sender: string;
    receiver: string;
    message: string;
}

export interface ApplicationInfo {
    username: string,
    nickname: string,
    avatar: string,
    message: string,
    createTime: Date
}

export interface RequestData {
    requestID: string;              // 申请信息 ID
    username: string;               // （好友申请）接收者
    groupID: string;                // （群申请）群 ID
    groupname: string;             // （群申请）群名称
    sender: string;                 // 申请发送者
    type: string;                   // 申请类型（"group" or "friend")
    reason: string;                 // 申请语（"pending" or "accepted" 状态）/拒绝原因（"rejected" 状态）
    status: string;                 // 申请状态（"pending" or "accepted" or "rejected"）
    createTime: Date;              // 申请时间
}

export class FriendshipApplicationModel {
    private db!: Db;

    /**
     * @summary 初始化数据库连接
     */
    async init() {
        this.db = await connectToDatabase();
    }

    /**
     * @summary 将新的好友申请存入数据库并返回相关信息
     * @param {ApplicationData} application - 好友关系
     */
    async createFriendship(application: ApplicationData): Promise<FriendshipApplication> {
        const friendshipsCollection = this.db.collection("friendshipApplication");
        const newFriendship = { ...application, createTime: new Date(), reject_reason: "", status: "pending" };
        const result = await friendshipsCollection.insertOne(newFriendship);
        return { ...newFriendship, _id: result.insertedId };
    }

    /**
     * @summary 根据用户名称获得申请中的好友列表
     * @param {string} username - 用户名称
     * @returns 申请中的好友申请数组
     */
    async getFriendsByUsername(username: string): Promise<RequestData[]> {
        const applicationsCollection = this.db.collection("friendshipApplication");
        const applications = await applicationsCollection.find<{ _id: ObjectId, receiver: string, sender: string, message: string, createTime: Date, status: string, reject_reason: string }>({ sender: username }).toArray();
        const infos = applications.map((application) => ({
            requestID: application._id,
            username: application.receiver,
            message: application.message,
            sender: application.sender,
            createTime: application.createTime,
            status: application.status,
            reason: application.reject_reason
        }));

        return infos.map((info) => ({
            requestID: info.requestID.toString(),
            username: info.username,
            groupID: "",
            groupname: "",
            sender: info.sender,
            reason: info.status === "rejected" ? info.reason : info.message,
            type: "friend",
            createTime: info.createTime,
            status: info.status,
        }));
    }

    /**
     * @summary 根据用户名称获得待审核的好友申请列表
     * @param {string} username - 用户名称
     * @returns 待审核的好友申请数组
     */
    async getApplicationsByUsername(username: string): Promise<RequestData[]> {
        const applicationsCollection = this.db.collection("friendshipApplication");

        const applications = await applicationsCollection.find<{ _id: ObjectId, receiver: string, sender: string, message: string, createTime: Date, status: string, reject_reason: string }>({ receiver: username }).toArray();

        const infos = applications.map((application) => ({
            requestID: application._id.toString(),
            username: application.receiver,
            sender: application.sender,
            message: application.message,
            createTime: application.createTime,
            status: application.status,
            reason: application.reject_reason
        }));

        return infos.map((info) => ({
            requestID: info.requestID,
            username: info.username,
            groupID: "",
            groupname: "",
            sender: info.sender,
            type: "friend",
            reason: info.status === "rejected" ? info.reason : info.message,
            createTime: info.createTime,
            status: info.status,
        }));
    }

    /**
     * @summary 通过申请
     * @param {string} receiver - 接收者用户名
     * @param {string} sender - 发送者用户名
     * @returns {boolean} 通过成功时返回 true
     */
    async acceptApplication(receiver: string, sender: string, requestId: ObjectId) {
        const applicationsCollection = this.db.collection("friendshipApplication");
        const friendshipModel = new FriendshipModel();
        await friendshipModel.init();
        try {
            await applicationsCollection.updateOne({_id: requestId}, {$set: {status: "accepted"}});
            const result = await friendshipModel.createFriendship({sender, receiver});
            return result._id;
        } catch (error) {
            console.error("Error accepting application:", error);
            throw new Error(`Application does not exist. ${error}`);
        }
    }

    /**
     * @summary 拒绝通过申请
     * @param {ObjectId} requestId - 申请记录 ID
     * @param {string} reason - 拒绝理由
     * @returns {boolean} 拒绝成功时返回 true
     */
    async rejectApplication(requestId: ObjectId, reason: string): Promise<boolean> {
        const applicationsCollection = this.db.collection("friendshipApplication");
        try {
            await applicationsCollection.updateOne({_id: requestId}, {$set: {status: "rejected", reject_reason: reason}});
            return true;
        } catch (error) {
            console.error("Error rejecting applicatino:", error);
            throw new Error(`Application does not exist. ${error}`);
        }
    }

    /**
     * @summary 关闭数据库连接
     */
    async close() {
        await closeDatabaseConnection();
    }
}
const friendshipApplicationModel = new FriendshipApplicationModel();

export default FriendshipApplicationModel;
export { friendshipApplicationModel };