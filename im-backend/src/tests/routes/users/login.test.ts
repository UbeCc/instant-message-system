import { FastifyRequest } from "fastify";
import { userModel, initFastify } from "../../../server";
import { connectToDatabase } from "../../../models/database";

describe("POST /api/login", () => {
    let request: FastifyRequest<{ Body: string }>;
    const testAvatar = "https://api.dicebear.com/7.x/miniavs/svg?seed=1";

    beforeAll(async () => {
        const db = await connectToDatabase();
        db.collection("user").deleteMany({});
    });

    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});

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
    it("should respond with edited user info when editing is successful", async () => {
        const fastify = await initFastify();
        await userModel.createUser({
            username: "test-username",
            password: "test-password",
            nickname: "test-nickname"
        });
        request.body = (
            JSON.stringify({
                username: "test-username",
                password: "test-password"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/login",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Login successfully.",
            token: expect.any(String),
            user: {
                username: "test-username",
                nickname: "test-nickname",
                avatar: testAvatar
            }
        });
    });

    // 2. 测试用户不存在
    it("should respond with \"User Doesn't Exist.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                username: "test-username",
                password: "test-password"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/login",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            code: -1,
            msg: "User Doesn't Exist.",
        });
    });

    // 3. 密码错误
    it("should respond with \"Password wrong.\" when password is wrong.", async () => {
        const fastify = await initFastify();
        await userModel.createUser({
            username: "test-username",
            password: "test-password",
            nickname: "test-nickname"
        });
        request.body = (
            JSON.stringify({
                username: "test-username",
                password: "another-test-password"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/login",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Password wrong."
        });
    });
});