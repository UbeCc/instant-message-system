import { FastifyRequest } from "fastify";
import { userModel, initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";

describe("GET /api/user/:username", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token: string;

    const testUsername = "test-username";
    const testPassword = "test-password";
    const testNickname = "test-nickname";
    const defaultAvatar = "https://api.dicebear.com/7.x/miniavs/svg?seed=1";
    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
        token = await getSignedToken(testUsername);
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
    it("should respond with edited user info when editing is successful", async () => {
        const fastify = await initFastify();
        await userModel.createUser({
            username: testUsername,
            password: testPassword,
            nickname: testNickname
        });

        const response = await fastify.inject({
            method: "GET",
            url: "/api/user/" + testUsername,
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Successfully fetched user info.",
            user: {
                username: testUsername,
                nickname: testNickname,
                description: "",
                avatar: defaultAvatar,
                email: "",
                lastLoginTime: expect.any(String),
                password: expect.any(String),
                isOnline: expect.any(Boolean),
            }
        });
    });

    // 2. 测试用户不存在
    it("should respond with \"User doesn't exist.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/user/" + testUsername,
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

});