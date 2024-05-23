import { ObjectId } from "mongodb";
import { ApplicationData } from "../../models/groupApplication";
import { groupApplicationModel, userModel, groupModel, groupMemberModel } from "../../server";
import { connectToDatabase } from "../../models/database";

describe("GroupApplicationModel", () => {
    let testGroupId: ObjectId;
    let testRequestId: ObjectId;
    const testGroupName = "test-group";
    const testAvatar = "https://api.dicebear.com/7.x/miniavs/svg?seed=1";
    const testUsername = "test-member";
    const testMasterUsername = "test-master";
    const testAdminUsername = "test-admin";
    const testNickname = "test-nickname";
    const testMessage = "Please let me join!";
    const testReason = "Sorry but you're not welcomed.";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
        await db.collection("group").deleteMany({});
        await db.collection("groupMember").deleteMany({});

        await userModel.init();
        await userModel.createUser({ username: testUsername, password: "password", nickname: "nickname" });
        await userModel.createUser({ username: testMasterUsername, password: "password", nickname: "nickname" });
        await userModel.createUser({ username: testAdminUsername, password: "password", nickname: "nickname" });

        await groupModel.init();
        const group = await groupModel.createGroup({ groupname: testGroupName, master: testMasterUsername });
        testGroupId = group._id;

        await groupMemberModel.init();
        await groupMemberModel.createGroupMember({ groupID: testGroupId, username: testMasterUsername, group_nickname: testNickname, role: 0 });
        await groupMemberModel.createGroupMember({ groupID: testGroupId, username: testAdminUsername, group_nickname: testNickname, role: 1 });

        await groupApplicationModel.init();
    });

    beforeEach(async () => {
        // 清空或重置测试集合
        const db = await connectToDatabase();
        await db.collection("groupApplication").deleteMany({});
    });

    afterAll(async () => {
        await groupApplicationModel.close();
    });

    describe("createGroupApplication()", () => {
        it("should insert a new group application into the database and return the full application details", async () => {
            const applicationData: ApplicationData = {
                groupID: testGroupId,
                username: testUsername,
                message: testMessage,
            };
            const createdApplication = await groupApplicationModel.createGroupApplication(applicationData);

            expect(createdApplication).toHaveProperty("_id");
            expect(createdApplication.groupID).toEqual(testGroupId);
            expect(createdApplication.username).toBe(testUsername);
            expect(createdApplication.message).toBe(testMessage);
            expect(createdApplication.avatar).toBe(testAvatar);
            expect(createdApplication.join_time).toBeInstanceOf(Date);
        });
    });

    describe("getApplicationByUsername()", () => {
        beforeEach(async () => {
            const applicationData: ApplicationData = {
                groupID: testGroupId,
                username: testUsername,
                message: testMessage
            };
            await groupApplicationModel.createGroupApplication(applicationData);
        });

        it("should retrieve a list of group applications for a specific admin or owner", async () => {
            const applications = await groupApplicationModel.getApplicationByUsername(testAdminUsername);
            expect(applications).not.toBeNull();
            expect(applications).toHaveLength(1);
            if (applications !== null && applications.length > 0) {
                expect(applications[0]).toHaveProperty("requestID", expect.any(String));
                expect(applications[0]).toHaveProperty("username", "");
                expect(applications[0]).toHaveProperty("groupID", testGroupId.toString());
                expect(applications[0]).toHaveProperty("groupname", testGroupName);
                expect(applications[0]).toHaveProperty("reason", testMessage);
                expect(applications[0]).toHaveProperty("sender", testUsername);
                expect(applications[0]).toHaveProperty("createTime", expect.any(Date));
                expect(applications[0]).toHaveProperty("type", "group");
                expect(applications[0]).toHaveProperty("status", "pending");
            }
        });
    });

    describe("getWaitingListByUsername()", () => {
        beforeEach(async () => {
            const applicationData: ApplicationData = {
                groupID: testGroupId,
                username: testUsername,
                message: testMessage
            };
            await groupApplicationModel.createGroupApplication(applicationData);
        });

        it("should retrieve a list of groups where the user has an outstanding application", async () => {
            const waitingList = await groupApplicationModel.getWaitingListByUsername(testUsername);
            expect(waitingList).not.toBeNull();
            expect(waitingList).toHaveLength(1);
            if (waitingList !== null && waitingList.length > 0){
                expect(waitingList[0]).toHaveProperty("requestID", expect.any(String));
                expect(waitingList[0]).toHaveProperty("username", "");
                expect(waitingList[0]).toHaveProperty("groupID", testGroupId.toString());
                expect(waitingList[0]).toHaveProperty("groupname", testGroupName);
                expect(waitingList[0]).toHaveProperty("reason", testMessage);
                expect(waitingList[0]).toHaveProperty("sender", testUsername);
                expect(waitingList[0]).toHaveProperty("createTime", expect.any(Date));
                expect(waitingList[0]).toHaveProperty("type", "group");
                expect(waitingList[0]).toHaveProperty("status", "pending");
            }
        });
    });

    describe("acceptApplication()", () => {
        beforeEach(async () => {
            const applicationData: ApplicationData = {
                groupID: testGroupId,
                username: testUsername,
                message: testMessage
            };
            const application = await groupApplicationModel.createGroupApplication(applicationData);
            testRequestId = application._id;
        });

        it("should remove the application from the waiting collection and add the user as a member with role 2", async () => {
            const isAccepted = await groupApplicationModel.acceptApplication(testGroupId, testUsername, testRequestId);
            expect(isAccepted).toBe(true);

            // 验证申请状态变化为 "accepted"
            const db = await connectToDatabase();
            const application = await db.collection("groupApplication").findOne({ _id: testRequestId });
            expect(application?.status).toBe("accepted");

            // 验证用户已作为普通成员（角色为2）加入到群成员集合
            const groupMembersCollection = db.collection("groupMember");
            const groupMembers = await groupMembersCollection.find({ username: testUsername }).toArray();
            expect(groupMembers).toHaveLength(1);
            expect(groupMembers[0]).toHaveProperty("groupID", testGroupId);
            expect(groupMembers[0]).toHaveProperty("role", 2);
        });
    });

    describe("rejectApplication()", () => {
        beforeEach(async () => {
            const applicationData: ApplicationData = {
                groupID: testGroupId,
                username: testUsername,
                message: testMessage
            };
            const application = await groupApplicationModel.createGroupApplication(applicationData);
            testRequestId = application._id;
        });

        it("should remove the application from the waiting collection", async () => {
            const isRejected = await groupApplicationModel.rejectApplication(testRequestId, testReason);
            expect(isRejected).toBe(true);

            // 验证申请状态变化为 "rejected"
            const db = await connectToDatabase();
            const application = await db.collection("groupApplication").findOne({ _id: testRequestId });
            expect(application?.status).toBe("rejected");
            expect(application?.reject_reason).toBe(testReason);
        });
    });
});
