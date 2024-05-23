import { ObjectId, Db } from "mongodb";
import { connectToDatabase, closeDatabaseConnection } from "./database";
import { groupMemberModel } from "./groupMember";
import ConvMessageModel from "./convMessage";

export interface Group {
    _id: ObjectId;            // 群 ID
    groupname: string;       // 群名称
    master: string;           // 群主的 username
    admins?: string[];        // 管理员 username 列表
    avatar?: string;          // 群头像
    createTime: Date;        // 建群时间
    invite_check: boolean;    // 邀请是否需要审核（默认为 true ）
    announcement?: string;    // 群公告
}

export interface GroupWithMember {
    _id: ObjectId;            // 群 ID
    groupname: string;       // 群名称
    master: string;           // 群主的 username
    admins?: string[];        // 管理员 username 列表
    avatar?: string;          // 群头像
    createTime: Date;        // 建群时间
    invite_check: boolean;    // 邀请是否需要审核（默认为 true ）
    announcement?: string;    // 群公告
    memberList: string[];  // 群成员列表
}

export interface GroupData {
    groupname: string;      // 群名称
    master: string;          // 群主的 username
}

export interface GroupInfo {
    groupID: ObjectId;      // 群 ID
    groupname: string;      // 群名称
    avatar: string;      // 群头像
}

class GroupModel {
    private db!: Db;
    /**
     * @summary 初始化数据库连接
     */
    async init() {
        this.db = await connectToDatabase();
    }
    /**
     * @summary 将新群组信息保存至数据库，并返回完整的群组详情
     * @param {GroupData} group - 群组数据
     */
    async createGroup(group: GroupData): Promise<Group> {
        const groupsCollection = this.db.collection("group");
        const convMessageModel = new ConvMessageModel();
        await convMessageModel.init();

        const newGroup = { ...group, createTime: new Date(), invite_check: false, avatar: "", admins: [], announcement: ""};
        const result = await groupsCollection.insertOne(newGroup);

        await convMessageModel.createConvMessage(result.insertedId);
        return { ...newGroup, _id: result.insertedId };
    }

    /**
     * @summary 根据群名获得群聊
     * @param {string} groupName - 群聊名称
     */
    async getGroupByGroupname(groupName: string): Promise<GroupInfo[]> {
        const groupsCollection = this.db.collection("group");
        const groups = await groupsCollection.find<{ _id: ObjectId, groupname: string, avatar: string}>({ groupname: groupName, invite_check: false }).toArray();

        return groups.map(group => ({
            groupID: group._id,
            groupname: group.groupname,
            avatar: group.avatar
        }));
    }

    /**
     * @summary 根据群 ID 获得群聊
     * @param {ObjectId} groupId - 群聊 ID
     */
    async getGroupInfoByGroupId(groupId: ObjectId): Promise<GroupWithMember | null> {
        const groupsCollection = this.db.collection("group");

        // Step 1: 获取群聊信息
        const group = await groupsCollection.findOne<{ _id: ObjectId, groupname: string, master: string, admin: string[], avatar: string, createTime: Date, invite_check: boolean, announcement: string}>({ _id: groupId });

        // Step 2: 获取成员列表
        if (group === null) {
            return null;
        }

        const groupMembers = await groupMemberModel.getGroupMemberByGroupId(group._id);
        const memberList = groupMembers ? groupMembers.map(member => member.username) : [];
        return { ...group, memberList };
    }

    /**
     * @summary 检查群聊是否存在
     * @param {string} groupname - 群聊名称
     */
    async checkGroupnameExists(groupname: string) {
        const groupsCollection = this.db.collection("group");
        try {
            const group = await groupsCollection.findOne({ groupname });
            return Boolean(group);
        } catch (error) {
            console.error("Error checking if groupname exists:", error);
            throw new Error(`Failed to check groupname existence. ${error}`);
        }
    }

    /**
     * @summary 修改群信息
     */
    async editGroup(groupId: ObjectId, groupName: string, avatar: string, inviteCheck: boolean, announcement: string) {
        const groupsCollection = this.db.collection("group");
        const group = await groupsCollection.findOne<{groupname: string, avatar: string, invite_check: boolean, announcement: string}>({ _id: groupId });
        if (group) {
            group.groupname = groupName;
            group.avatar = avatar;
            group.invite_check = inviteCheck;
            group.announcement = announcement;
            await groupsCollection.updateOne({ _id: groupId }, { $set: group });
        }
        return { ...group, _id: groupId };
    }

    /**
     * @summary 转让群主
     */
    async transferMaster(groupID: ObjectId, oldMaster: string, newMaster: string) {
        const groupsCollection = this.db.collection("group");
        const groupMemberCollection = this.db.collection("groupMember");
        // 1. 确认新任群主存在于指定群组
        const groupMember = await groupMemberCollection.findOne({ groupID, username: newMaster });
        if (groupMember === null) {
            throw new Error("The new master isn't in the group.");
        } else {  // 2. “更新群组群主信息” 与 “新旧群主自己的 role ”
            await groupsCollection.updateOne({ _id: groupID }, { $set: { master: newMaster } });
            await groupMemberCollection.updateOne({ groupID, username: oldMaster }, { $set: { role: 2 } });
            await groupMemberCollection.updateOne({ groupID, username: newMaster }, { $set: { role: 0 } });
        }
    }

    /**
     * @summary 编辑管理员
     */
    async editAdmin(groupID: ObjectId, master: string, admins: string[]) {
        const groupsCollection = this.db.collection("group");
        const groupMemberCollection = this.db.collection("groupMember");
        // 1. 确认群组存在
        const group = await groupsCollection.findOne({ _id: groupID });
        if (group === null) {
            throw new Error("The group doesn't exist.");
        }
        // 2. 若 “任何一位管理员替补不在群组中” 或 “试图将群主设为管理员”，抛出异常
        for (const admin of admins) {
            const groupMember = await groupMemberCollection.findOne({ groupID, username: admin });
            if (groupMember === null) {
                throw new Error(`${admin} isn't in the group.`);
            } else if (admin === master) {
                throw new Error("The master can't be an admin.");
            }
        }
        // 3. 更新群组管理员列表
        await groupsCollection.updateOne({ _id: groupID }, { $set: { admins } });
        // 4. 将旧管理员的 role 全部置为 2
        const oldAdmins = group.admins;
        for (const admin of oldAdmins) {
            await groupMemberCollection.updateOne({ groupID, username: admin }, { $set: { role: 2 } });
        }
        // 5. 将新管理员的 role 全部置为 1
        for (const admin of admins) {
            await groupMemberCollection.updateOne({ groupID, username: admin }, { $set: { role: 1 } });
        }
    }

    /**
     * @summary 关闭数据库连接
     */
    async close() {
        await closeDatabaseConnection();
    }
}
const groupModel = new GroupModel();

export { groupModel };
export default GroupModel;
