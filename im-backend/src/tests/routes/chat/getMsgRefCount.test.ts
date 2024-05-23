import { FastifyRequest } from "fastify";
import { groupMemberModel, friendshipModel, convMessageModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";
import { Message } from "../../../models/convMessage";

describe("DELETE /api/message/refer", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    let testFriendshipID: ObjectId;
    const testUsername1 = "test-username1";
    const testUsername2 = "test-username2";
    const testGroupID = new ObjectId();
    const testContent = "test-content";
    const testMsg1: Message = {
        sender: testUsername1,
        content: testContent,
        createTime: new Date(),
        _id: new ObjectId().toString(),
        refCount: 0,
        refMessage:  null
    };

    beforeAll(async () => {
        const db = await connectToDatabase();
        db.collection("convMessage").deleteMany({});
        db.collection("friendship").deleteMany({});

        await friendshipModel.init();
        const friendship = await friendshipModel.createFriendship({sender: testUsername1, receiver: testUsername2});
        testFriendshipID = friendship._id;

        await groupMemberModel.init();
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername1, group_nickname: testUsername1, role: 0});

        await convMessageModel.init();
        await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMsg1 });
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
        await convMessageModel.close();
    });

    // 1. 私聊中删除消息
    it("should respond with successful message when they are friends", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                convID: testFriendshipID,
                msgID: testMsg1._id
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/message/refer",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Get message reference count successfully.",
            refCount: 0,
            refMessage: null
        });
    });

    // 2. 异常处理（鉴权）
    it("should respond with \"Error Getting Message By Time. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "POST",
            url: "/api/message/refer",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Getting Message Reference Count. Error: Invalid refresh token",
            refCount: 0,
            refMessage: null
        });
    });
});