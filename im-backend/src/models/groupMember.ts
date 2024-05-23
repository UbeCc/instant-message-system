import { ObjectId, Db } from "mongodb";
import { connectToDatabase, closeDatabaseConnection } from "./database";

export interface GroupMember {
    _id: ObjectId;
    groupID: ObjectId;        // 群 ID
    username: string;        // 用户名称
    group_nickname: string;  // 用户群昵称
    join_time: Date;         // 入群时间
    deleteList: string[];  // 删除列表
    role: number;            // 群角色：| 0：群主，1：管理员，2：普通成员
    cursor: Date;           // 用户在群中的最后阅读时间
}

export interface GroupMemberData {
    groupID: ObjectId;        // 群 ID
    username: string;        // 用户名称
    group_nickname: string;  // 用户群昵称
    role: number;            // 群角色：| 0：群主，1：管理员，2：普通成员
}

export interface GroupMemberInfo {
    username: string;        // 用户名称
    group_nickname: string;  // 用户群昵称
    avatar: string;      // 用户头像
}

export interface GroupInfo {
    groupID: ObjectId;        // 群 ID
    groupname: string;        // 群名称
    avatar: string;            // 群头像
    userList: string[];
}

class GroupMemberModel {
    private db!: Db;

    /**
     * @summary 初始化数据库连接
     */
    async init() {
        this.db = await connectToDatabase();
    }

    /**
     * @summary 根据群 ID 获得群成员
     * @param {ObjectId} groupId - 群 ID
     */
    async getGroupMemberByGroupId(groupId: ObjectId): Promise<GroupMemberInfo[] | null> {
        const groupMembersCollection = this.db.collection("groupMember");
        const usersCollection = this.db.collection("user");

        // Step 1: 获取 groupMember 集合中 groupId 对应的成员基本信息
        const groupMemberships = await groupMembersCollection.find<{ username: string, group_nickname: string }>({ groupID: groupId }).toArray();

        // Step 2: 用 username 构造一个集合用于在 users 集合中查询
        const usernamesToFetchAvatars = groupMemberships.map(groupMember => groupMember.username);

        // Step 3: 异步地获取每个群组成员的 avatar 信息
        const userAvatarsPromises = usernamesToFetchAvatars.map(async (username) => {
            const user = await usersCollection.findOne<{ avatar: string }>({ username });
            return user ? user?.avatar : "";
        });
        const avatars = await Promise.all(userAvatarsPromises);

        // Step 5: 合并群组成员信息与对应的 avatar 信息
        const groupMemberInfos = groupMemberships.map((groupMember, index) => ({
            username: groupMember.username,
            group_nickname: groupMember.group_nickname,
            avatar: avatars[index],
        }));

        // 返回处理后的群组成员信息列表
        return groupMemberInfos.length > 0 ? groupMemberInfos : null;
    }

    /**
     * @summary 将新用户信息保存至数据库，并返回完整的用户详情
     * @param {GroupMemberData} groupMember - 用户数据
     */
    async createGroupMember(groupMember: GroupMemberData): Promise<GroupMember> {
        const groupMembersCollection = this.db.collection("groupMember");
        const newGroupMember = { ...groupMember, join_time: new Date(), deleteList: [], cursor: new Date()};
        const result = await groupMembersCollection.insertOne(newGroupMember);
        return { ...newGroupMember, _id: result.insertedId };
    }

    /**
     * @summary 搜寻群成员
     * @param {ObjectId} groupId - 群 ID
     * @param {string} groupNickname - 群昵称
     */
    async searchForMember(groupId: ObjectId, groupNickname: string): Promise<GroupMemberInfo[]> {
        const groupMembersCollection = this.db.collection("groupMember");
        const usersCollection = this.db.collection("user");

        // 使用 $and 操作符组合两个条件
        const searchConditions = {
            $and: [
                { groupID: groupId }, // 群 ID 相等
                { group_nickname: groupNickname } // 群昵称相等
            ]
        };

        const groupMemberships = await groupMembersCollection.find<{ username: string, group_nickname: string }>(searchConditions).toArray();

        const usernamesToFetchAvatars = groupMemberships.map(groupMember => groupMember.username);

        const userAvatarsPromises = usernamesToFetchAvatars.map(async (username) => {
            const user = await usersCollection.findOne<{ avatar: string }>({ username });
            return user ? user?.avatar : "";
        });

        const avatars = await Promise.all(userAvatarsPromises);

        const groupMemberInfos = groupMemberships.map((groupMember, index) => ({
            username: groupMember.username,
            group_nickname: groupMember.group_nickname,
            avatar: avatars[index]
        }));

        return groupMemberInfos;
    }

    /**
     * @summary 获取指定用户所属群组列表
     * @param {string} username - 用户名称
     * @returns {GroupInfo[]} - 群组列表
     */
    async getGroupsByUsername(username: string): Promise<GroupInfo[]> {
        const groupMembersCollection = this.db.collection("groupMember");
        const groupsCollection = this.db.collection("group");

        // Step 1: 查询 groupMember 集合中 username 对应的 groupID 列表
        const groupInfos = await groupMembersCollection.find<{ cursor: Date, groupID: ObjectId }>({ username }).toArray();

        // Step 2: 从查询结果中提取 groupID，并于 group 集合中获取对应群组信息
        const groupInfoPromises = groupInfos.map(async (groupInfo) => {
            const groupId = groupInfo.groupID;
            const cursor = groupInfo.cursor;
            const group = await groupsCollection.findOne<{ _id: ObjectId, avatar: string, groupname: string }>({ _id: groupId });
            const rawUserList = await this.getGroupMemberByGroupId(groupId);
            if (rawUserList === null) {
                throw new Error("Group not found");
            }
            const userList = rawUserList.map((user) => user.username);
            const userCursors: Date[] = [];
            if (userList === null) {
                throw new Error("User list not found");
            }
            for (const user of userList) {
                const cursorList = await groupMembersCollection.find<{ cursor: Date }>({ username: user, groupID: ObjectId }).toArray();
                userCursors.push(cursorList[0].cursor);
            }
            if (group === null) {
                throw new Error("Group not found");
            }
            return { ...group, cursor, userList, userCursors};
        });

        const groups = await Promise.all(groupInfoPromises);

        // Step 3: 得到群 ID，群名称和群头像
        const groupDetailInfos = groups.map(group => {
            return {
                groupID: group._id,
                groupname: group.groupname,
                avatar: group.avatar,
                cursor: group.cursor,
                userCursors: group.userCursors
            };
        });

        // Step 4: 为每个群组获取成员列表
        const groupMembersPromises = groupDetailInfos.map(async (groupInfo) => {
            const groupMembers = await this.getGroupMemberByGroupId(groupInfo.groupID);
            if (groupMembers === null) {
                throw new Error("Group members not found");
            }
            return {
                ...groupInfo,
                userList: groupMembers.map(user => user.username)
            };
        });
        const curGroupInfos: GroupInfo[] = await Promise.all(groupMembersPromises);
        return curGroupInfos;
    }

    async updateConvCursor(username: string, cursor: Date, id: string) {
        console.log("UPDATE GROUP CURSOR", username, cursor, id);
        const groupMembersCollection = this.db.collection("groupMember");
        await groupMembersCollection.updateOne({ groupID: new ObjectId(id), username }, { $set: { cursor } });
        return true;
    }

    /**
     * @summary 更新群组cursor
     */
    async updateCursor(username: string, date: Date): Promise<boolean> {
        const groupMembersCollection = this.db.collection("groupMember");
        const groupsInfo = await this.getGroupsByUsername(username);
        const groupIDs = groupsInfo.map((groupsInfo) => groupsInfo.groupID);
        let cnt = 0;
        for (const groupID of groupIDs) {
            const result = await groupMembersCollection.updateOne({ groupID, username }, { $set: { cursor: date } });
            cnt += result.modifiedCount;
        }
        return cnt === groupIDs.length;
    }

    /**
     * @summary 搜寻群成员
     * @param {ObjectId} groupId - 群 ID
     * @param {string} username - 用户名称
     */
    async getRole(groupId: ObjectId, username: string): Promise<number> {
        const groupMembersCollection = this.db.collection("groupMember");

        const group = await groupMembersCollection.findOne<{ role: number }>({ groupID: groupId, username });

        return group ? group?.role : 3;
    }

    // 删除群主
    async deleteMaster(groupId: ObjectId, memberName: string, memberRole: number) {
        const groupsCollection = this.db.collection("group");
        const groupMembersCollection = this.db.collection("groupMember");

        if (memberRole === 1) {  // 删除管理员，需要更新管理员列表
            await groupMembersCollection.deleteOne({ groupID: groupId, username: memberName });
            const oldGroup = await groupsCollection.findOne<{admins: string[]}>({ _id: groupId });
            if (!oldGroup) {
                throw new Error("Group doesn't exist.");
            }
            oldGroup.admins = oldGroup.admins.filter(admin => admin !== memberName);
            await groupsCollection.updateOne({ _id: groupId }, { $set: { admins: oldGroup.admins } });
            return 0;
        } else if (memberRole === 2){  // 删除普通成员
            await groupMembersCollection.deleteOne({ groupID: groupId, username: memberName });
            return 0;
        } else {
            return 1;
        }
    }

    /**
     * @summary 删除群成员（需要群主或管理员权限，且只能删除普通成员）
     * @param {ObjectId} groupId - 群 ID
     * @param {string} username - 执行删除的用户名
     * @param {string} memberName - 被删除的用户名
     * @returns {number} 0: 删除成功；1: 不能删群主或管理员；2：无群主或管理员权限
     */
    async deleteGroupMember(groupId: ObjectId, username: string, memberName: string): Promise<number> {
        const groupMembersCollection = this.db.collection("groupMember");

        const group = await groupMembersCollection.findOne<{ role: number }>({ groupID: groupId, username });
        const memberGroup = await groupMembersCollection.findOne<{ role: number }>({ groupID: groupId, username: memberName });

        try {
            if (!group || !memberGroup) {
                throw new Error("At least one of the two isn't in the group.");
            }
            const role = group.role;
            const memberRole = memberGroup.role;
            if (role === 0) { // 群主可以删群主以外任何人
                return await this.deleteMaster(groupId, memberName, memberRole);
            } else if (role === 1) { // 管理员可以删除除了群主和管理员以外的普通成员
                if (memberRole === 2) {
                    await groupMembersCollection.deleteOne({ groupID: groupId, username: memberName });
                    return 0;
                } else {
                    return 1;
                }
            }
            else {  // 普通成员无法删除其他成员
                return 2;
            }
        } catch(error) {
            // 未知错误处理
            console.error("Deleting group members failed.", error);
            throw new Error(`Deleting group members failed. ${error}`);
        }
    }

    async exitMaster(groupId: ObjectId, username: string, group: { master: string, admins: string[] }|null, master?: string) {
        const groupMembersCollection = this.db.collection("groupMember");
        const groupsCollection = this.db.collection("group");

        await groupMembersCollection.deleteOne({ groupID: groupId, username });
        if (group) {
            if (master === undefined) {
                throw new Error("Master not specified.");
            }
            const successor = await groupMembersCollection.findOne<{ role: number }>({ groupID: groupId, username: master });
            if (!successor) {
                throw new Error("Successor not found in the group.");
            }
            if (successor.role === 1) {  // 若新任群主原来是管理员，需删除管理员身份
                if (group.admins) {
                    group.admins = group.admins.filter(admin => admin !== master);
                }
            }
            await groupsCollection.updateOne({ _id: groupId }, { $set: { master, admins: group.admins } });
            await groupMembersCollection.updateOne({ groupID: groupId, username: master }, { $set: { role: 0 } });
        }
    }

    /**
     * @summary 退出群聊
     * @param {ObjectId} groupId - 群 ID
     * @param {string} username - 用户名称
     * @param {string} master - 继任群主（optional）
     */
    async exitGroup(groupId: ObjectId, username: string, master?: string): Promise<boolean> {
        const groupMembersCollection = this.db.collection("groupMember");
        const groupsCollection = this.db.collection("group");

        const groupship = await groupMembersCollection.findOne<{ role: number }>({ groupID: groupId, username });
        const group = await groupsCollection.findOne<{ master: string, admins: string[] }>({ _id: groupId });
        const role = groupship?.role;
        try {
            // 1. 群主退出，需要转让群主
            if (role === 0) {
                await this.exitMaster(groupId, username, group, master);
                return true;
            } else if (role === 1) { // 2. 管理员退出，需要删除管理员身份
                await groupMembersCollection.deleteOne({ groupID: groupId, username });
                if(group) {
                    if (group.admins) {
                        group.admins = group.admins.filter(admin => admin !== username);
                    }
                }
                await groupsCollection.updateOne({ _id: groupId }, { $set: { admins: group?.admins } });
                return true;
            } else if(role === 2){ // 3. 普通成员退出，退就退吧（doge）
                await groupMembersCollection.deleteOne({ groupID: groupId, username });
                return true;
            } else {
                throw new Error("User not in the group.");
            }
        } catch(error) {
            // 未知错误处理
            console.error("Failed when exited from the group. ", error);
            throw new Error(`Failed when exited from the group. ${error}`);
        }
    }

    /**
     * @summary 关闭数据库连接
     */
    async close() {
        await closeDatabaseConnection();
    }
}
const groupMemberModel = new GroupMemberModel();
export {groupMemberModel};
export default GroupMemberModel;
