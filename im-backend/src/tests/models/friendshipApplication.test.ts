import { ApplicationData } from "../../models/friendshipApplication";
import { userModel, friendshipApplicationModel } from "../../server";
import { connectToDatabase } from "../../models/database";
import { ObjectId } from "mongodb";

describe("FriendshipApplicationModel", () => {
    const testSender = "sender1";
    const testReceiver = "receiver1";
    const testMessage = "Let's be friends!";
    const testApplication: ApplicationData = {
        sender: testSender,
        receiver: testReceiver,
        message: testMessage,
    };
    const testReason = "Sorry, but I am busy.";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
        await db.collection("friendship").deleteMany({});

        await userModel.init();
        await friendshipApplicationModel.init();
        await userModel.createUser({
            username: testSender,
            password: "password123",
            nickname: "Sender1",
        });
        await userModel.createUser({
            username: testReceiver,
            password: "password123",
            nickname: "Receiver1",
        });
    });

    beforeEach(async () => {
        // 清空或重置测试集合
        const db = await connectToDatabase();
        await db.collection("friendshipApplication").deleteMany({});
    });

    afterAll(async () => {
        await friendshipApplicationModel.close();
    });

    describe("createFriendship()", () => {
        it("should insert a new friendship application into the database", async () => {
            const createdFriendship = await friendshipApplicationModel.createFriendship(testApplication);
            expect(createdFriendship).toHaveProperty("_id");
            expect(createdFriendship.sender).toBe(testSender);
            expect(createdFriendship.receiver).toBe(testReceiver);
            expect(createdFriendship.message).toBe(testMessage);
            expect(createdFriendship.createTime).toBeInstanceOf(Date);
        });
    });

    describe("getFriendsByUsername()", () => {
        it("should retrieve pending friend requests sent by the given user", async () => {
            await friendshipApplicationModel.createFriendship(testApplication);

            const receivedRequests = await friendshipApplicationModel.getFriendsByUsername(testSender);
            expect(receivedRequests).toHaveLength(1);
            if (receivedRequests !== null && receivedRequests.length > 0){
                expect(receivedRequests[0]).toHaveProperty("reason", testMessage);
                expect(receivedRequests[0]).toHaveProperty("username", testReceiver);
                expect(receivedRequests[0]).toHaveProperty("sender", testSender);
                expect(receivedRequests[0]).toHaveProperty("status", "pending");
                expect(receivedRequests[0]).toHaveProperty("groupID", "");
                expect(receivedRequests[0]).toHaveProperty("groupname", "");
                expect(receivedRequests[0]).toHaveProperty("type", "friend");
            }
        });

        it("should retrieve rejected friend requests received by the given user", async () => {
            await friendshipApplicationModel.createFriendship(testApplication);
            const db = await connectToDatabase();
            await db.collection("friendshipApplication").updateOne({ sender: testSender, receiver: testReceiver }, { $set: { status: "rejected", reject_reason: testReason } });
            const receivedRequests = await friendshipApplicationModel.getFriendsByUsername(testSender);
            expect(receivedRequests).toHaveLength(1);
            if (receivedRequests !== null && receivedRequests.length > 0) {
                expect(receivedRequests[0]).toHaveProperty("reason", testReason);
                expect(receivedRequests[0]).toHaveProperty("username", testReceiver);
                expect(receivedRequests[0]).toHaveProperty("sender", testSender);
                expect(receivedRequests[0]).toHaveProperty("status", "rejected");
                expect(receivedRequests[0]).toHaveProperty("groupID", "");
                expect(receivedRequests[0]).toHaveProperty("groupname", "");
                expect(receivedRequests[0]).toHaveProperty("type", "friend");
            }
        });
    });

    describe("getApplicationsByUsername()", () => {
        it("should retrieve pending friend requests received by the given user", async () => {
            await friendshipApplicationModel.createFriendship(testApplication);
            const receivedRequests = await friendshipApplicationModel.getApplicationsByUsername(testReceiver);
            expect(receivedRequests).toHaveLength(1);
            if (receivedRequests !== null && receivedRequests.length > 0) {
                expect(receivedRequests[0]).toHaveProperty("reason", testMessage);
                expect(receivedRequests[0]).toHaveProperty("username", testReceiver);
                expect(receivedRequests[0]).toHaveProperty("sender", testSender);
                expect(receivedRequests[0]).toHaveProperty("status", "pending");
                expect(receivedRequests[0]).toHaveProperty("groupID", "");
                expect(receivedRequests[0]).toHaveProperty("groupname", "");
                expect(receivedRequests[0]).toHaveProperty("type", "friend");
            }
        });

        it("should retrieve rejected friend requests received by the given user", async () => {
            await friendshipApplicationModel.createFriendship(testApplication);
            const db = await connectToDatabase();
            await db.collection("friendshipApplication").updateOne({ sender: testSender, receiver: testReceiver }, { $set: { status: "rejected", reject_reason: testReason } });
            const receivedRequests = await friendshipApplicationModel.getApplicationsByUsername(testReceiver);
            expect(receivedRequests).toHaveLength(1);
            if (receivedRequests !== null && receivedRequests.length > 0) {
                expect(receivedRequests[0]).toHaveProperty("reason", testReason);
                expect(receivedRequests[0]).toHaveProperty("username", testReceiver);
                expect(receivedRequests[0]).toHaveProperty("sender", testSender);
                expect(receivedRequests[0]).toHaveProperty("status", "rejected");
                expect(receivedRequests[0]).toHaveProperty("groupID", "");
                expect(receivedRequests[0]).toHaveProperty("groupname", "");
                expect(receivedRequests[0]).toHaveProperty("type", "friend");
            }
        });
    });

    describe("acceptApplication()", () => {
        it("should delete the application and create a friendship", async () => {
            await friendshipApplicationModel.createFriendship(testApplication);
            const db = await connectToDatabase();
            const application = await db.collection("friendshipApplication").findOne({sender: testSender, receiver: testReceiver});
            const testRequestID = application?._id;
            expect(testRequestID).not.toBeNull();
            if (testRequestID) {
                const isAccepted = await friendshipApplicationModel.acceptApplication(testReceiver, testSender, testRequestID);
                expect(isAccepted).toBeInstanceOf(ObjectId);

                // 验证 application 是否被标记为 "accepted"
                const applicationsAfterAccept = await db.collection("friendshipApplication").findOne({sender: testSender, receiver: testReceiver});
                expect(applicationsAfterAccept?.status).toBe("accepted");
                const friendship = await db.collection("friendship").findOne({sender: testSender, receiver: testReceiver});
                expect(friendship).not.toBeNull();
            }
        });
    });

    describe("rejectApplication()", () => {
        it("should delete the specified application", async () => {
            await friendshipApplicationModel.createFriendship(testApplication);
            const db = await connectToDatabase();
            const application = await db.collection("friendshipApplication").findOne({sender: testSender, receiver: testReceiver});
            const testRequestID = application?._id;
            expect(testRequestID).not.toBeNull();
            if (testRequestID) {
                const isRejected = await friendshipApplicationModel.rejectApplication(testRequestID, testReason);
                expect(isRejected).toBe(true);

                // 验证 application 是否被标记为 "rejected"
                const applicationsAfterReject = await db.collection("friendshipApplication").findOne({sender: testSender, receiver: testReceiver});
                expect(applicationsAfterReject?.status).toBe("rejected");
                expect(applicationsAfterReject?.reject_reason).toBe(testReason);
            }
        });
    });
});
