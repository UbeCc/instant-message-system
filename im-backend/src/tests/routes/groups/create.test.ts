import { FastifyRequest } from "fastify";
import { userModel, groupModel, groupMemberModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";

describe("POST /api/group/create", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    let testGroupID: ObjectId;
    const testUsername1 = "test-username1";
    const testUsername2 = "test-username2";
    const testUsername3 = "test-username3";
    const testPassword = "test-password";
    const testNickname =  "test-nickname";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});

        await userModel.init();
        await userModel.createUser({username: testUsername1, password: testPassword, nickname: testNickname});
        await userModel.createUser({username: testUsername2, password: testPassword, nickname: testNickname});
        await userModel.createUser({username: testUsername3, password: testPassword, nickname: testNickname});

        await groupModel.init();
        await groupMemberModel.init();
    });

    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("group").deleteMany({});
        await db.collection("groupMember").deleteMany({});
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

    // 1. 成功创建群聊
    describe("sendFriendRequestHandler()", () => {
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    usernameList: [testUsername2, testUsername3],
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/group/create",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Create group successfully.",
                groupID: expect.any(String),
                groupname: "Group of " + testUsername1,
                avatar: ""
            });
            const db = await connectToDatabase();
            const group = await db.collection("group").findOne({ groupname: "Group of " + testUsername1 });
            expect(group).not.toBeNull();
            const member1 = await db.collection("groupMember").findOne({ username: testUsername1 });
            const member2 = await db.collection("groupMember").findOne({ username: testUsername2 });
            const member3 = await db.collection("groupMember").findOne({ username: testUsername3 });
            expect(member1).not.toBeNull();
            expect(member2).not.toBeNull();
            expect(member3).not.toBeNull();
        });
    });

    // 2. usernameList 为 null
    describe("'usernameList' invalid", () => {
        it("should respond with failed message when they are not friends", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    usernameList: null,
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/group/create",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({
                code: -1,
                msg: "You must choose at least one group member."
            });
        });

        // 3. usernameList 为空列表
        it("should respond with \"'type' can only be 'group' or 'friend'\" when 'type' is not 'group' or 'friend'", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    usernameList: null,
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/group/create",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({
                code: -1,
                msg: "You must choose at least one group member."
            });
        });
    });

    // 4. 异常处理
    it("should respond with \"Error Creating Group. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "POST",
            url: "/api/group/create",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Creating Group. Error: Invalid refresh token"
        });
    });
});