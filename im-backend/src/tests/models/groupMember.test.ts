import { ObjectId } from "mongodb";
import { GroupMemberData } from "../../models/groupMember";
import { userModel, groupModel, groupMemberModel } from "../../server";
import { connectToDatabase } from "../../models/database";


describe("GroupMemberModel", () => {
    const testGroupName = "test-groupname";
    const testUsername = "test-username";
    const testGroupNickname = "test-group-nickname";
    const testAvatar = "https://api.dicebear.com/7.x/miniavs/svg?seed=1";
    const testRole = 2; // 普通成员
    const testMasterUsername = "test-master";
    const testAdminUsername = "test-admin";
    let testGroupId = new ObjectId();
    let groupMemberData = { groupID: testGroupId, username: testUsername, group_nickname: testGroupNickname, role: testRole } as GroupMemberData;

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
        await db.collection("group").deleteMany({});

        await userModel.init();
        await userModel.createUser({ username: testUsername, password: "password", nickname: "nickname" });
        await userModel.createUser({ username: testMasterUsername, password: "password", nickname: "nickname" });
        await userModel.createUser({ username: testAdminUsername, password: "password", nickname: "nickname" });

        await groupModel.init();
        const group = await groupModel.createGroup({
            groupname: testGroupName,
            master: testUsername
        });
        await db.collection("group").updateOne({ groupname: testGroupName }, { $set: { admins: [testAdminUsername] } });
        testGroupId = group._id;
        groupMemberData = { groupID: testGroupId, username: testUsername, group_nickname: testGroupNickname, role: testRole } as GroupMemberData;

        await groupMemberModel.init();
    });

    beforeEach(async () => {
        // 清空或重置测试集合
        const db = await connectToDatabase();
        await db.collection("groupMember").deleteMany({});
        await db.collection("group").updateOne({ _id: testGroupId }, { $set: {admins: [testAdminUsername]} });
    });

    afterAll(async () => {
        await groupMemberModel.close();
    });

    describe("createGroupMember()", () => {
        it("should insert a new group member into the database and return the complete group member details", async () => {
            const createdGroupMember = await groupMemberModel.createGroupMember(groupMemberData);
            expect(createdGroupMember).toHaveProperty("_id");
            expect(createdGroupMember.groupID).toEqual(testGroupId);
            expect(createdGroupMember.username).toBe(testUsername);
            expect(createdGroupMember.group_nickname).toBe(testGroupNickname);
            expect(createdGroupMember.role).toBe(testRole);
            expect(createdGroupMember.join_time).toBeInstanceOf(Date);
        });
    });

    describe("getGroupMemberByGroupId()", () => {
        it("should retrieve group members by their group ID and include their avatar information", async () => {
            await groupMemberModel.createGroupMember(groupMemberData);
            const groupMembers = await groupMemberModel.getGroupMemberByGroupId(testGroupId);
            expect(groupMembers).not.toBeNull();
            expect(groupMembers).toHaveLength(1);
            if (groupMembers !== null && groupMembers.length > 0){
                expect(groupMembers[0]).toHaveProperty("username", testUsername);
                expect(groupMembers[0]).toHaveProperty("group_nickname", testGroupNickname);
                expect(groupMembers[0]).toHaveProperty("avatar", testAvatar);
            }
        });
    });

    describe("searchForMember()", () => {
        it("should find group members by group ID and group nickname", async () => {
            await groupMemberModel.createGroupMember(groupMemberData);
            const searchedMembers = await groupMemberModel.searchForMember(testGroupId, testGroupNickname);
            expect(searchedMembers).not.toBeNull();
            expect(searchedMembers).toHaveLength(1);
            if (searchedMembers !== null && searchedMembers.length > 0) {
                expect(searchedMembers[0]).toHaveProperty("username", testUsername);
                expect(searchedMembers[0]).toHaveProperty("group_nickname", testGroupNickname);
                expect(searchedMembers[0]).toHaveProperty("avatar", testAvatar);
            }
        });
    });

    describe("getGroupsByUsername()", () => {
        it("should find group members by group ID and group nickname", async () => {
            await groupMemberModel.createGroupMember(groupMemberData);
            const groups = await groupMemberModel.getGroupsByUsername(testUsername);
            expect(groups).not.toBeNull();
            expect(groups).toHaveLength(1);
            if (groups !== null && groups.length > 0) {
                expect(groups[0]).toHaveProperty("groupID", testGroupId);
                expect(groups[0]).toHaveProperty("groupname", testGroupName);
                expect(groups[0]).toHaveProperty("avatar", "");
            }
        });
    });

    describe("getRole()", () => {
        it("should return the role if the user is in the group", async () => {
            await groupMemberModel.createGroupMember(groupMemberData);
            const role = await groupMemberModel.getRole(testGroupId, testUsername);
            expect(role).toEqual(testRole);
        });

        it("should return 3 if the user isn't in the group", async () => {
            const role = await groupMemberModel.getRole(testGroupId, testUsername);
            expect(role).toEqual(3);
        });
    });

    describe("deleteGroupMember()", () => {
        beforeEach(async () => {
            await groupMemberModel.createGroupMember(groupMemberData);
            await groupMemberModel.createGroupMember({ groupID: testGroupId, username: testMasterUsername, group_nickname: testGroupNickname, role: 0 });
            await groupMemberModel.createGroupMember({ groupID: testGroupId, username: testAdminUsername, group_nickname: testGroupNickname, role: 1 });
        });

        it("should delete an admin if the user is a master", async () => {
            const result = await groupMemberModel.deleteGroupMember(testGroupId, testMasterUsername, testAdminUsername);
            expect(result).toEqual(0);
            const db = await connectToDatabase();
            const group = await db.collection("group").findOne({ _id: testGroupId });
            expect(group).not.toBeNull();
            if (group) {
                expect(group.admins).toEqual([]);
            }
        });

        it("should delete an ordinary member if the user is a master", async () => {
            const result = await groupMemberModel.deleteGroupMember(testGroupId, testMasterUsername, testUsername);
            expect(result).toEqual(0);
        });

        it("shouldn't delete the master itself if the user is a master", async () => {
            const result = await groupMemberModel.deleteGroupMember(testGroupId, testMasterUsername, testMasterUsername);
            expect(result).toEqual(1);
        });

        it("should return 1 when the user is an admin but tries to remove a master or an admin", async () => {
            const result = await groupMemberModel.deleteGroupMember(testGroupId, testAdminUsername, testMasterUsername);
            expect(result).toEqual(1);
        });

        it("should delete an ordinary member if the user is an admin", async () => {
            const result = await groupMemberModel.deleteGroupMember(testGroupId, testAdminUsername, testUsername);
            expect(result).toEqual(0);
        });

        it("shouldn't delete anyone if the user is an ordinary member", async () => {
            const result = await groupMemberModel.deleteGroupMember(testGroupId, testUsername, testMasterUsername);
            expect(result).toEqual(2);
        });

        it("should throw an error if at least one of the two is not in the group", async () => {
            await expect(groupMemberModel.deleteGroupMember(testGroupId, "passer-by", testMasterUsername)).rejects.toThrow("At least one of the two isn't in the group.");
        });
    });

    describe("exitGroup()", () => {
        beforeEach(async () => {
            await groupMemberModel.createGroupMember(groupMemberData);
            await groupMemberModel.createGroupMember({ groupID: testGroupId, username: testMasterUsername, group_nickname: testGroupNickname, role: 0 });
            await groupMemberModel.createGroupMember({ groupID: testGroupId, username: testAdminUsername, group_nickname: testGroupNickname, role: 1 });
        });

        // A. 群主退出，继任者为管理员，管理员需从管理员列表中删除
        it("should change master to an admin and delete admin from the 'admins' when master exit", async () => {
            const result = await groupMemberModel.exitGroup(testGroupId, testMasterUsername, testAdminUsername);
            expect(result).toBeTruthy();

            const db = await connectToDatabase();
            const newGroup = await db.collection("group").findOne<{ master: string, admins: string[] }>({ _id: testGroupId });
            expect(newGroup?.master).toEqual(testAdminUsername);
            expect(newGroup?.admins).toEqual([]);
            const newMaster = await db.collection("groupMember").findOne<{ role: number }>({ groupID: testGroupId, username: testAdminUsername });
            expect(newMaster?.role).toEqual(0);
            const oldMaster = await db.collection("groupMember").findOne({ groupID: testGroupId, username: testMasterUsername });
            expect(oldMaster).toBeNull();
        });

        // B. 群主退出，继任者为普通成员
        it("should change master to an ordinary member when master exit", async () => {
            const result = await groupMemberModel.exitGroup(testGroupId, testMasterUsername, testUsername);
            expect(result).toBeTruthy();

            const db = await connectToDatabase();
            const newGroup = await db.collection("group").findOne<{ master: string }>({ _id: testGroupId });
            expect(newGroup?.master).toEqual(testUsername);
            const newMaster = await db.collection("groupMember").findOne<{ role: number }>({ groupID: testGroupId, username: testUsername });
            expect(newMaster?.role).toEqual(0);
            const oldMaster = await db.collection("groupMember").findOne({ groupID: testGroupId, username: testMasterUsername });
            expect(oldMaster).toBeNull();
        });

        // C. 群主退出，没有指定继任者，抛出异常
        it("should throw error when master exit without specifying a successor", async () => {
            await expect(groupMemberModel.exitGroup(testGroupId, testMasterUsername, undefined)).rejects.toThrow("Master not specified.");
        });

        // D. 群主退出，继任者不在群中，抛出异常
        it("should throw error when master exit with the successor not in the group", async () => {
            await expect(groupMemberModel.exitGroup(testGroupId, testMasterUsername, "passer-by")).rejects.toThrow("Successor not found in the group.");
        });

        // E. 退出申请者不在群中，抛出异常
        it("should throw error when the user is not in the group", async () => {
            await expect(groupMemberModel.exitGroup(testGroupId, "passer-by", undefined)).rejects.toThrow("User not in the group.");
        });

        // F. 管理员退出，管理员从管理员列表中删除
        it("should delete admin from the 'admins' when admin exit", async () => {
            const result = await groupMemberModel.exitGroup(testGroupId, testAdminUsername, undefined);
            expect(result).toBeTruthy();

            const db = await connectToDatabase();
            const newGroup = await db.collection("group").findOne<{ master: string, admins: string[] }>({ _id: testGroupId });
            expect(newGroup?.admins).toEqual([]);
            const exitUser = await db.collection("groupMember").findOne<{ role: number }>({ groupID: testGroupId, username: testAdminUsername });
            expect(exitUser).toBeNull();
        });

        // G. 普通成员退出
        it("should delete the ordinary member when an ordinary member exit", async () => {
            const result = await groupMemberModel.exitGroup(testGroupId, testUsername, undefined);
            expect(result).toBeTruthy();

            const db = await connectToDatabase();
            const exitUser = await db.collection("groupMember").findOne<{ role: number }>({ groupID: testGroupId, username: testUsername });
            expect(exitUser).toBeNull();
        });
    });

    describe("updateConvCursor()", () => {
        it("should update conv cursor", async () => {
            const result = await groupMemberModel.updateConvCursor(testUsername, new Date(), testGroupId.toString());
            expect(result).toBe(true);
        });
    });
});
