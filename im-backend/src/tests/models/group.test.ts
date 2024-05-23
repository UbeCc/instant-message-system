import { groupMemberModel, groupModel } from "../../server";
import { connectToDatabase } from "../../models/database";
import { GroupData } from "../../models/group";
import { ObjectId } from "mongodb";

describe("GroupModel", () => {
    const testGroupName = "Test Group";
    const testMasterUsername = "master_user";
    const testAdminUsername = "admin_user";
    const testUsername = "test_user";
    const testGroupNickname = "test_group_nickname";
    const groupData: GroupData = {
        groupname: testGroupName,
        master: testMasterUsername,
    };
    let testGroupID: ObjectId;

    beforeAll(async () => {
        await groupModel.init();
        await groupMemberModel.init();
    });
    beforeEach(async () => {
        // 清空或重置测试集合
        const db = await connectToDatabase();
        await db.collection("group").deleteMany({});
        await db.collection("groupMember").deleteMany({});
    });
    afterAll(async () => {
        await groupModel.close();
    });

    it("should insert a new group into the database and return the complete group details", async () => {
        const createdGroup = await groupModel.createGroup(groupData);
        expect(createdGroup).toHaveProperty("_id");
        expect(createdGroup.groupname).toBe(testGroupName);
        expect(createdGroup.master).toBe(testMasterUsername);
        expect(createdGroup.createTime).toBeInstanceOf(Date);
        expect(createdGroup.invite_check).toBe(false);
    });

    describe("createGroup()", () => {
        it("should insert a new group into the database and return the complete group details", async () => {
            const createdGroup = await groupModel.createGroup(groupData);
            expect(createdGroup).toHaveProperty("_id");
            expect(createdGroup.groupname).toBe(testGroupName);
            expect(createdGroup.master).toBe(testMasterUsername);
            expect(createdGroup.createTime).toBeInstanceOf(Date);
            expect(createdGroup.invite_check).toBe(false);
        });
    });

    describe("getGroupByGroupname()", () => {
        it("should retrieve groups by their group name", async () => {
            await groupModel.createGroup(groupData);
            const foundGroups = await groupModel.getGroupByGroupname(testGroupName);
            expect(foundGroups).toHaveLength(1);
            if (foundGroups !== null && foundGroups.length > 0){
                expect(foundGroups[0]).toHaveProperty("groupID");
                expect(foundGroups[0].groupname).toBe(testGroupName);
                expect(foundGroups[0].avatar).toBe("");
            }
        });
    });

    describe("getGroupInfoByGroupId()", () => {
        it("should retrieve group information by its group ID", async () => {
            const insertedGroup = await groupModel.createGroup(groupData);
            const groupId = insertedGroup._id;
            const group = await groupModel.getGroupInfoByGroupId(groupId);
            expect(group).toHaveProperty("_id", groupId);
            if (group !== null) {
                expect(group.groupname).toBe(testGroupName);
                expect(group.master).toBe(testMasterUsername);
                expect(group.createTime).toBeInstanceOf(Date);
                expect(group.invite_check).toBe(false);
            }
        });

        it("should retrieve null when group doesn't exist", async () => {
            const group = await groupModel.getGroupInfoByGroupId(new ObjectId());
            expect(group).toBe(null);
        });
    });

    describe("checkGroupnameExists()", () => {
        it("should correctly report whether a groupname exists in the database", async () => {
            await groupModel.createGroup(groupData);

                const exists = await groupModel.checkGroupnameExists(testGroupName);
                expect(exists).toBeTruthy();

                const nonExistent = await groupModel.checkGroupnameExists("Nonexistent Group");
                expect(nonExistent).toBeFalsy();
        });
    });

    describe("editGroup()", () => {
        it("should respond with edited group info when succeed", async () => {
            const group = await groupModel.createGroup(groupData);
            const testGroupID = group?._id;
            const newGroupName = "new-groupname";
            const newAvatar = "new-avatar";
            const newInviteCheck = false;
            const newAnnouncement = "new-announcement";

            const editedGroup = await groupModel.editGroup(testGroupID, newGroupName, newAvatar, newInviteCheck, newAnnouncement);
            expect(editedGroup.groupname).toBe(newGroupName);
            expect(editedGroup.avatar).toBe(newAvatar);
            expect(editedGroup.invite_check).toBe(newInviteCheck);
            expect(editedGroup.announcement).toBe(newAnnouncement);
        });
    });

    describe("transferMaster()", () => {
        // 1. 转让成功
        it("should respond with edited group info when succeed", async () => {
            const group = await groupModel.createGroup(groupData);
            await groupMemberModel.createGroupMember({groupID: group._id, username: testMasterUsername, group_nickname: testGroupNickname, role: 0});
            await groupMemberModel.createGroupMember({groupID: group._id, username: testUsername, group_nickname: testGroupNickname, role: 2});
            await groupModel.transferMaster(group._id, group.master, testUsername);
            const db = await connectToDatabase();
            const newGroup = await db.collection("group").findOne({_id: group._id});
            expect(newGroup?.master).toBe(testUsername);
            const old_master = await db.collection("groupMember").findOne({groupID: group._id, username: testMasterUsername});
            expect(old_master?.role).toBe(2);
            const new_master = await db.collection("groupMember").findOne({groupID: group._id, username: testUsername});
            expect(new_master?.role).toBe(0);
        });

        // 2. 群组不存在，抛出异常
        it("should throw error when the group doesn't exist", async () => {
            await expect(groupModel.transferMaster(new ObjectId(), testUsername, "")).rejects.toThrow("The new master isn't in the group.");
        });
    });

    describe("editAdmin()", () => {
        beforeEach(async () => {
            const group = await groupModel.createGroup(groupData);
            testGroupID = group._id;
        });

        // 1. 群组不存在时，抛出异常
        it("should throw error when the group doesn't exist", async () => {
            await expect(groupModel.editAdmin(new ObjectId(), testUsername, [""])).rejects.toThrow("The group doesn't exist.");
        });

        // 2. 若 “任何一位管理员替补不在群组中” ，抛出异常
        it("should throw error when one admin is not in the group", async () => {
            // console.log(testGroupID);
            await expect(groupModel.editAdmin(testGroupID, testMasterUsername, ["passer-by"])).rejects.toThrow("passer-by isn't in the group.");
        });

        // 3. 若 “试图将群主设为管理员”，抛出异常
        it("should throw error when try to set the master as admin", async () => {
            await groupMemberModel.createGroupMember({groupID: testGroupID, username: testMasterUsername, group_nickname: testGroupNickname, role: 0});
            await expect(groupModel.editAdmin(testGroupID, testMasterUsername, [testMasterUsername])).rejects.toThrow("The master can't be an admin.");
        });

        // 4. 成功，旧管理员的role变为2，新管理员的role变为1
        it("should throw error when try to set the master as admin", async () => {
            await groupMemberModel.createGroupMember({groupID: testGroupID, username: testAdminUsername, group_nickname: testGroupNickname, role: 1});
            await groupMemberModel.createGroupMember({groupID: testGroupID, username: testUsername, group_nickname: testGroupNickname, role: 2});

            const db = await connectToDatabase();
            await db.collection("group").updateOne({_id: testGroupID}, {$set: {admins: [testAdminUsername]}});
            // console.log(await db.collection("group").findOne({_id: testGroupID}));
            await groupModel.editAdmin(testGroupID, testMasterUsername, [testUsername]);

            const old_admin = await db.collection("groupMember").findOne({groupID: testGroupID, username: testAdminUsername});
            expect(old_admin?.role).toBe(2);
            const new_admin = await db.collection("groupMember").findOne({groupID: testGroupID, username: testUsername});
            expect(new_admin?.role).toBe(1);
        });
    });
});
