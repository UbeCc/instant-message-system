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
    let testFriendshipID: ObjectId;
    let testGroupID: ObjectId;
    const testUsername1 = "test-username1";
    const testUsername2 = "test-username2";
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
    const testMsg2: Message = {
        sender: testUsername1,
        content: testContent,
        createTime: new Date(),
        _id: "",
        refCount: 0,
        refMessage:  null
    };
    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("group").deleteMany({});
        await db.collection("groupMember").deleteMany({});
        await db.collection("user").deleteMany({});
        await db.collection("convMessage").deleteMany({});
        await db.collection("friendship").deleteMany({});

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

        await convMessageModel.init();
        await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMsg1 });
        await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMsg2 });
        await convMessageModel.createMessage({ conv_id: testGroupID, message: testMsg1 });
        await convMessageModel.createMessage({ conv_id: testGroupID, message: testMsg2 });
    });

    beforeEach(async () => {
        token1 = await getSignedToken(testUsername1);

        request = {
            body: "",
            headers: {
                authorization: token1,
            }
        } as FastifyRequest<{ Body: string }>;
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await userModel.close();
    });

    // 1. 私聊中按时间获取消息
    it("should respond with successful message when they are friends", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                convID: testFriendshipID,
                sender: testUsername1
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/message/sender",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "get message list by sender successfully.",
            msgList: [{
                    sender: testUsername1,
                    content: testContent,
                    createTime: expect.any(String),
                    _id: testMsg1._id.toString(),
                    refCount: 0,
                    refMessage:  null
                }, {
                    sender: testUsername1,
                    content: testContent,
                    createTime: expect.any(String),
                    _id: testMsg2._id.toString(),
                    refCount: 0,
                    refMessage:  null
            }]
        });
    });

    // 2. 群聊中按时间获取消息
    it("should respond with successful message when they are friends", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                convID: testFriendshipID,
                sender: testUsername1
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/message/sender",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "get message list by sender successfully.",
            msgList: [{
                sender: testUsername1,
                content: testContent,
                createTime: expect.any(String),
                _id: testMsg1._id.toString(),
                refCount: 0,
                refMessage:  null
            }, {
                sender: testUsername1,
                content: testContent,
                createTime: expect.any(String),
                _id: testMsg2._id.toString(),
                refCount: 0,
                refMessage:  null
            }]
        });
    });

    // 3. 异常处理（鉴权）
    it("should respond with \"Error Getting Message By Sender. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "POST",
            url: "/api/message/sender",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Getting Message By Sender. Error: Invalid refresh token",
            msgList:[]
        });
    });

    // 4. 会话不存在
    it("should respond with \"Error Getting Message By Sender. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                convID: new ObjectId(),
                sender: testUsername1
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/message/sender",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Getting Message By Sender. Error: Error Getting Message List By Sender In Model. Error: The conversation doesn't exist.",
            msgList: []
        });
    });
});