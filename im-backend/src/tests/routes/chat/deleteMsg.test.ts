import { FastifyRequest } from "fastify";
import { groupMemberModel, friendshipModel, convMessageModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";
import { Message } from "../../../models/convMessage";

describe("DELETE /api/message/delete", () => {
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
    const testStartTime = testMsg1.createTime;
    const testMsg2: Message = {
        sender: testUsername2,
        content: testContent,
        createTime: new Date(),
        _id: new ObjectId().toString(),
        refCount: 0,
        refMessage:  null
    };
    const testFinishTime = testMsg2.createTime;
    beforeAll(async () => {
        const db = await connectToDatabase();
        db.collection("groupMember").deleteMany({});
        db.collection("convMessage").deleteMany({});
        db.collection("friendship").deleteMany({});

        await friendshipModel.init();
        const friendship = await friendshipModel.createFriendship({sender: testUsername1, receiver: testUsername2});
        testFriendshipID = friendship._id;

        await groupMemberModel.init();
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername1, group_nickname: testUsername1, role: 0});

        await convMessageModel.init();
        await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMsg1 });
        await convMessageModel.createMessage({ conv_id: testGroupID, message: testMsg1 });
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
            method: "DELETE",
            url: "/api/message/delete",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Delete massage successfully."
        });

        const db = await connectToDatabase();
        const friendship = await db.collection("friendship").findOne<{ senderDeleteList: string[] }>({ _id: testFriendshipID, sender: testUsername1 });
        expect(friendship?.senderDeleteList).toHaveLength(1);
        expect(friendship?.senderDeleteList[0]).toEqual(testMsg1._id.toString());
    });

    // 2. 群聊中删除消息
    it("should respond with successful message when they are friends", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                convID: testGroupID,
                msgID: testMsg1._id
            })
        );

        const response = await fastify.inject({
            method: "DELETE",
            url: "/api/message/delete",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Delete massage successfully."
        });

        const db = await connectToDatabase();
        const friendship = await db.collection("groupMember").findOne<{ deleteList: string[] }>({ groupID: testGroupID, username: testUsername1 });
        expect(friendship?.deleteList).toHaveLength(1);
        expect(friendship?.deleteList[0]).toEqual(testMsg1._id.toString());
    });

    // 3. 异常处理（鉴权）
    it("should respond with \"Error Getting Message By Time. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "DELETE",
            url: "/api/message/delete",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Deleting Massage. Error: Invalid refresh token"
        });
    });

    // 4. 指定的用户和会话对应的删除列表不存在
    it("should respond with \"Error Deleting Massage. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                convID: new ObjectId(),
                startTime: testStartTime,
                finishTime: testFinishTime
            })
        );

        const response = await fastify.inject({
            method: "DELETE",
            url: "/api/message/delete",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Deleting Massage. Error: Error Deleteing Message In Model. Error: Delete list not found."
        });
    });
});