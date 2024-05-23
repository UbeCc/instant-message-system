import { FastifyRequest } from "fastify";
import { userModel, friendshipModel, friendshipApplicationModel, groupModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";

describe("POST /api/request/send", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    let testGroupID: ObjectId;
    const testGroupname = "test-groupname";
    const testUsername1 = "test-username1";
    const testPassword1 = "test-password1";
    const testNickname1 =  "test-nickname1";
    const testUsername2 = "test-username2";
    const testPassword2 = "test-password2";
    const testNickname2 =  "test-nickname2";
    const testReason = "test-reason";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
        await db.collection("group").deleteMany({});

        await userModel.init();
        await userModel.createUser({username: testUsername1, password: testPassword1, nickname: testNickname1});
        await userModel.createUser({username: testUsername2, password: testPassword2, nickname: testNickname2});

        await groupModel.init();
        const group = await groupModel.createGroup({groupname: testGroupname, master: testUsername2});
        testGroupID = group._id;

        await friendshipModel.init();
        await friendshipApplicationModel.init();
    });

    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("friendship").deleteMany({});
        await db.collection("friendshipApplication").deleteMany({});
        await db.collection("groupApplication").deleteMany({});
        token1 = await getSignedToken(testUsername1);

        request = {
            body: "",
            headers: {
                authorization: token1,
            }
        } as FastifyRequest<{ Body: string }>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        friendshipModel.close();
    });

    // 1. 发送好友申请
    describe("sendFriendRequestHandler()", () => {
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    receiver: testUsername2,
                    reason: testReason,
                    type: "friend"
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/request/send",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Application sent successfully.",
                requestID: expect.any(String),
                createTime: expect.any(String)
            });
        });
    });

    // 2. 发送入群申请
    describe("sendGroupRequestHandler()", () => {
        it("should respond with failed message when they are not friends", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    reason: testReason,
                    type: "group"
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/request/send",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Application sent successfully.",
                requestID: expect.any(String),
                createTime: expect.any(String)
            });
        });
    });

    // 3. 非法类型申请（not "group" or "friend"）
    it("should respond with \"'type' can only be 'group' or 'friend'\" when 'type' is not 'group' or 'friend'", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                type: "invalid type"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/request/send",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "'type' can only be 'group' or 'friend'."
        });
    });

    // 4. 异常处理
    it("should respond with \"Error Sending Request. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "POST",
            url: "/api/request/send",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Sending Request. Error: Invalid refresh token"
        });
    });
});