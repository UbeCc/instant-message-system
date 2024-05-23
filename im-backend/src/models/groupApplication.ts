import { ObjectId, Db } from "mongodb";
import { connectToDatabase, closeDatabaseConnection } from "./database";

export interface Application {
    _id: ObjectId;
    groupID: ObjectId;        // 群 ID
    username: string;        // 用户名称
    message: string;         // 申请入群理由
    avatar: string;      // 用户头像
    join_time: Date;         // 申请入群时间
    reject_reason: string;    // 拒绝理由
    status: string;          // 申请状态: pending, accepted or rejected
}

export interface ApplicationData {
    groupID: ObjectId;        // 群 ID
    username: string;        // 用户名称
    message: string;         // 申请入群理由
}

export interface RequestData {
    requestID: string;
    username: string;
    groupID: string;
    groupname: string;
    sender: string;
    type: string;
    reason: string;
    status: string;
    createTime: Date;
}

export interface ApplicationGroupInfo {
    groupID: ObjectId;        // 群 ID
    group_name: string;        // 群头像
    message: string;         // 申请入群理由
    avatar: string;      // 用户头像
    join_time: Date;         // 申请入群时间
    reason: string;         // 拒绝理由
    status: string;          // 申请状态: pending, accepted or rejected
}

export interface GroupInfo {
    groupID: ObjectId;      // 群 ID
    groupname: string;      // 群名称
    avatar: string;      // 群头像
}

class GroupApplicationModel {
    private db!: Db;

    /**
     * @summary 初始化数据库连接
     */
    async init() {
        this.db = await connectToDatabase();
    }

    /**
     * @summary 将新的入群申请保存至数据库，并返回完整的用户详情
     * @param {GroupMemberData} groupMember - 用户数据
     */
    async createGroupApplication(groupMember: ApplicationData): Promise<Application> {
        const usersCollection = this.db.collection("user");
        const waitingCollection = this.db.collection("groupApplication");
        const user = await usersCollection.findOne({ username: groupMember.username });
        const avatar = user?.avatar;
        const newGroupMember = { ...groupMember, avatar, join_time: new Date(), reject_reason: "", status: "pending" };
        const result = await waitingCollection.insertOne(newGroupMember);
        return { ...newGroupMember, _id: result.insertedId };
    }

    /**
     * @summary 获取某个用户要审核的申请信息列表
     * @param {string} username - 用户名称
     */
    async getApplicationByUsername(username: string): Promise<RequestData[]> {
        try {
            const waitingCollection = this.db.collection("groupApplication");
            const groupMembersCollection = this.db.collection("groupMember");
            const groupsCollection = this.db.collection("group");

            const queryCondition = {
                role: { $in: [0, 1] },
                username
            };

            // Step 1: 获取该用户作为群主或者管理员的群
            const groups = await groupMembersCollection.find<{ groupID: ObjectId }>(queryCondition).toArray();

            // Step 2: 获取对应的群 ID
            const groupIds = groups.map(group => group.groupID);

            // Step 3: 异步地获取每个群的入群申请者信息
            const applicationPromises = groupIds.map(async (groupId: ObjectId) => {
                const applications = await waitingCollection.find<{ _id: ObjectId, username: string, message: string, join_time: Date, status: string, reject_reason: string }>({ groupID: groupId }).toArray();
                return (applications || []).map(application => ({
                    requestID: application._id,
                    groupID: groupId,
                    sender: application.username,
                    message: application.message,
                    join_time: application.join_time,
                    status: application.status,
                    reason: application.reject_reason
                }));
            });

            const applications = (await Promise.all(applicationPromises)).flat();

            const groupIDs = applications.map(application => application.groupID);
            const groupInfosPromises = groupIDs.map(groupID =>
                groupsCollection.findOne({ _id: groupID }).then(groupInfo => {
                    if (groupInfo !== null) {
                        return groupInfo;
                    } else {
                        // 返回一个 Promise.reject()，以便在 Promise.all() 中捕获到错误
                        return Promise.reject(new Error(`GroupInfo for groupID ${groupID} is null`));
                    }
                })
            );
            const groupInfos = await Promise.all(groupInfosPromises);

            // 返回处理后的群组成员信息列表
            return applications.map((application, index) => ({
                requestID: application.requestID.toString(),
                username: "",
                groupID: application.groupID.toString(),
                groupname: groupInfos[index].groupname,
                // avatar: users[index].avatar,
                sender: application.sender,
                reason: application.status === "rejected" ? application.reason : application.message,
                type: "group",
                createTime: application.join_time,
                status: application.status,
            }));
        } catch (error) {
            throw new Error("Error getting application by username.");
        }
    }

    /**
     * @summary 获取某个用户的要 “被” 审核的群列表
     * @param {string} username - 用户名称
     */
    async getWaitingListByUsername(username: string): Promise<RequestData[]> {
        try {
            const waitingCollection = this.db.collection("groupApplication");
            const groupsCollection = this.db.collection("group");

            // Step 1: 获取该用户申请加入的群
            const rowApplications = await waitingCollection.find<{
                groupID: ObjectId, _id: ObjectId, username: string,
                message: string, join_time: Date, status: string, reject_reason: string
            }>({ username }).toArray();

            const applications = rowApplications.map(application => ({
                sender: username,
                requestID: application._id,
                message: application.message,
                join_time: application.join_time,
                status: application.status,
                reason: application.reject_reason
            }));

            // Step 2: 获取对应的群 ID
            const groupIds = rowApplications.map(application => application.groupID);

            const groups = await groupsCollection.aggregate([
                {
                    $match: { _id: { $in: groupIds } }
                }
            ]).toArray();

            // 返回处理后的群组成员信息列表
            return applications.map((application, index) => ({
                requestID: application.requestID.toString(),
                username: "",
                groupID: groups[index]._id.toString(),
                groupname: groups[index].groupname,
                // avatar: groups[index].avatar,
                sender: application.sender,
                reason: application.status === "rejected" ? application.reason : application.message,
                type: "group",
                status: application.status,
                createTime: application.join_time
            }));
        } catch (error) {
            throw new Error("Error getting waiting list by username.");
        }
    }

    /**
     * @summary 通过申请
     * @param {ObjectId} groupId - 群 ID
     * @param {string} username - 申请者用户名
     * @returns {boolean} 通过成功时返回 true
     */
    async acceptApplication(groupId: ObjectId, username: string, requestId: ObjectId): Promise<boolean> {
        const applicationsCollection = this.db.collection("groupApplication");
        const groupMemberCollection = this.db.collection("groupMember");
        try {
            await applicationsCollection.updateOne({ _id: requestId }, { $set: { status: "accepted" } });
            const newGroupMember = {
                groupID: groupId, username, group_nickname: username,
                join_time: new Date(), role: 2
            };
            await groupMemberCollection.insertOne(newGroupMember);
            return true;
        } catch (error) {
            console.error("Error accepting application:", error);
            throw new Error(`Error accepting group Application. ${error}`);
        }
    }

    /**
     * @summary 拒绝申请
     * @param {ObjectId} requestId - 申请记录 ID
     * @param {string} reason - 拒绝原因
     * @returns {boolean} 拒绝成功时返回 true
     */
    async rejectApplication(requestId: ObjectId, reason: string): Promise<boolean> {
        const applicationsCollection = this.db.collection("groupApplication");
        try {
            await applicationsCollection.updateOne({ _id: requestId }, { $set: { status: "rejected", reject_reason: reason } });
            return true;
        } catch (error) {
            console.error("Error accepting application:", error);
            throw new Error("Application does not exist.");
        }
    }

    /**
     * @summary 关闭数据库连接
     */
    async close() {
        await closeDatabaseConnection();
    }
}
const groupApplicationModel = new GroupApplicationModel();
export { groupApplicationModel };
export default GroupApplicationModel;
