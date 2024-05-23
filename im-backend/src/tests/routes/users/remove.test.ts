import { FastifyRequest } from "fastify";
import { userModel, initFastify } from "../../../server";
import { connectToDatabase } from "../../../models/database";
import { getSignedToken } from "../../../utils";

describe("POST /api/login", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token: string;
    const testUsername = "test-user";
    const testPassword = "test-password";
    const testNickname = "test-nickname";

    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});

        token = await getSignedToken(testUsername);
        request = {
            body: "",
            headers: {
                authorization: ""
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
    it("should respond with successful info when successfully remove the user", async () => {
        const fastify = await initFastify();
        await userModel.createUser({
            username: testUsername,
            password: testPassword,
            nickname: testNickname
        });

        const response = await fastify.inject({
            method: "DELETE",
            url: "/api/remove/user",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Delete user successfully."
        });
        const db = await connectToDatabase();
        const user = await db.collection("user").findOne({ username: testUsername });
        expect(user?.isGhost).toBe(true);
    });

    // 2. 测试用户不存在
    it("should respond with \"The user doesn't exist.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "DELETE",
            url: "/api/remove/user",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "The user doesn't exist."
        });
    });

    // 3. 异常处理
    it("should handle error when there is one.", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "DELETE",
            url: "/api/remove/user",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error deleting user. Error: Invalid refresh token"
        });
    });
});