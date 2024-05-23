import { FastifyRequest } from "fastify";
import { userModel, groupModel, groupMemberModel, friendshipModel, convMessageModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";
import { Message } from "../../../models/convMessage";

describe("POST /api/group/create", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    let token3: string;
    let testFriendshipID: ObjectId;
    let testGroupID: ObjectId;
    const testUsername1 = "test-username1";
    const testUsername2 = "test-username2";
    const testUsername3 = "test-username3";
    const testGroupName = "test-groupname";
    const testPassword = "test-password";
    const testNickname = "test-nickname";
    const testContent = "test-content";
    const testMsg1: Message = {
        sender: testUsername1,
        content: testContent,
        createTime: new Date(),
        _id: "",
        refCount: 0,
        refMessage:  null
    };
    const testStartTime = testMsg1.createTime;
    console.log("testStartTime", testStartTime);
    const testMsg2: Message = {
        sender: testUsername2,
        content: testContent,
        createTime: new Date(),
        _id: "",
        refCount: 0,
        refMessage:  null
    };

    beforeAll(async () => {
        const db = await connectToDatabase();
        db.collection("group").deleteMany({});
        db.collection("groupMember").deleteMany({});
        db.collection("user").deleteMany({});
        db.collection("convMessage").deleteMany({});
        db.collection("friendship").deleteMany({});

        await userModel.init();
        await userModel.createUser({username: testUsername1, password: testPassword, nickname: testNickname});
        await userModel.createUser({username: testUsername2, password: testPassword, nickname: testNickname});

        await friendshipModel.init();
        const friendship = await friendshipModel.createFriendship({sender: testUsername1, receiver: testUsername2});
        testFriendshipID = friendship._id;

        await groupModel.init();
        const group = await groupModel.createGroup({groupname: testGroupName, master: testUsername1});
        testGroupID = group._id;

        await groupMemberModel.init();
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername1, group_nickname: testUsername1, role: 0});
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername2, group_nickname: testUsername2, role: 1});
    });

    beforeEach(async () => {
        token1 = await getSignedToken(testUsername1);
        token3 = await getSignedToken(testUsername3);

        request = {
            body: "",
            headers: {}
        } as FastifyRequest<{ Body: string }>;
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await userModel.close();
    });

    // 1. 按时间获取消息
    describe("getMessageHandler()", () => {
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();

            const testURL = "/api/message/get" +
            "?conversationID=" + testFriendshipID +
            "&after=" + testStartTime +
            "&limit=100";

            const response = await fastify.inject({
                method: "GET",
                url: testURL,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Load messages successfully.",
                messages: [],
                has_next: false
            });
        });
    });

    // 2. 加载聊天室列表
    describe("getConversationIDsHandler()", () => {
        beforeAll(async () => {
            await convMessageModel.init();
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMsg1 });
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMsg2 });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMsg1 });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMsg2 });
        });

        // a. 加载成功
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();

            const response = await fastify.inject({
                method: "GET",
                url: "/api/list/conversation",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Get conversation ids successfully",
                conversationIDs: [testFriendshipID.toString(), testGroupID.toString()],
                avatars: ["https://api.dicebear.com/7.x/miniavs/svg?seed=1", ""],
                lastLoginTime: expect.any(String),
                username: testUsername1
            });
        });

        // b. 用户不存在，加载失败
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();

            const response = await fastify.inject({
                method: "GET",
                url: "/api/list/conversation",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token3,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: -1,
                msg: "User doesn't exist."
            });
        });
    });
});