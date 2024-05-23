import { FastifyRequest } from "fastify";
import { userModel, initFastify } from "../../../server";
import { connectToDatabase } from "../../../models/database";

describe("POST /api/register", () => {
    let request: FastifyRequest<{ Body: string }>;

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
        await userModel.removeUser("test-username");

        request.body = (
            JSON.stringify({
                username: "test-username",
                password: "test-password",
                nickname: "test-nickname"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/register",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            token: expect.any(String),
            msg: "User registered successfully."
        });
    });

    // 2. 测试用户已存在
    it("should respond with \"User Already Exists.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();

        await userModel.createUser({
            username: "test-username",
            password: "test-password",
            nickname: "test-nickname"
        });

        request.body = (
            JSON.stringify({
                username: "test-username",
                password: "test-password",
                nickname: "test-nickname"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/register",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "User Already Exists.",
        });
    });

    // 3. 没写用户名
    it("should respond with \"Username and password are required.\" when there is not a username.", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                password: "test-password",
                nickname: "test-nickname"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/register",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Username is required."
        });
    });

    // 4. 没写密码
    it("should respond with \"Password is required.\" when there is not a password.", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                username: "test-username",
                nickname: "test-nickname"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/register",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Password is required."
        });
    });

    // 5. 没写昵称
    it("should respond with \"Username is required.\" when there is not a nickname.", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                username: "test-username",
                password: "test-password"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/register",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Nickname is required."
        });
    });
});