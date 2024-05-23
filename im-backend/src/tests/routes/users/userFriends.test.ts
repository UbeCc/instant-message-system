import { FastifyRequest, FastifyReply } from "fastify";
import { userModel, friendshipModel, initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";

describe("GET /api/list/friend", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token: string;
    const testUsername1 = "test-username1";
    const testPassword1 = "test-password1";
    const testNickname1 =  "test-nickname1";
    const testUsername2 = "test-username2";
    const testPassword2 = "test-password2";
    const testNickname2 =  "test-nickname2";

    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
        await db.collection("friendship").deleteMany({});
        token = await getSignedToken(testUsername1);
        request = {
            body: "",
            headers: {
                authorization: token,
            }
        } as FastifyRequest<{ Body: string }>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        userModel.close();
    });

    // 1. 顺利通过
    it("should return friend list when everything is right", async () => {
        const fastify = await initFastify();
        await userModel.init();
        await userModel.createUser({username: testUsername1, password: testPassword1, nickname: testNickname1});
        await userModel.createUser({username: testUsername2, password: testPassword2, nickname: testNickname2});
        await friendshipModel.init();
        await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });

        const response = await fastify.inject({
            method: "GET",
            url: "/api/list/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });


        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Successfully fetched user friends.",
            userList: [{
                avatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=1",
                nickname: testNickname2,
                username: testUsername2,
                tag: "",
                cursor: expect.any(String),
                friendCursor: expect.any(String),
                id: expect.any(String)
            }]
        });
    });

    // 2. 测试用户不存在
    it("should respond with \"User doesn't exist.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/list/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            code: -1,
            msg: "User doesn't exist."
        });
    });

    // 3. 异常处理
    it("should respond with \"Error Fetching user profile. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/list/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Fetching User Friends. Error: Invalid refresh token",
            userList: []
        });
    });
});
