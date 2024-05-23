import { FastifyRequest } from "fastify";
import { userModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";

describe("POST /api/user/edit", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token: string;
    const testUsername = "test-username";
    const testPassword = "test-password";
    const testNickname =  "test-nickname";
    const newNickname = "new-nickname";
    const newDescription = "new-description";
    const newAvatar = "new-avatar";
    const newEmail = "new-email";
    const newPassword = "new-password";

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
        request.body = (
            JSON.stringify({
                nickname: newNickname,
                description: newDescription,
                avatar: newAvatar,
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/user/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "User Info Edited Successfully.",
            user: {
                nickname: newNickname,
                avatar: newAvatar,
                description: newDescription,
                lastLoginTime: expect.any(String)
            }
        });
    });

    // 2. 测试修改信息且用户不存在
    it("should respond with \"User Doesn't Exist.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                nickname: newNickname,
                description: newDescription,
                avatar: newAvatar,
                email: newEmail
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/user/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "User doesn't exist.",
        });
    });

    // 3. 测试重置密码且用户不存在
    it("should respond with \"User Doesn't Exist.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                oldPassword: testPassword,
                newPassword
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/user/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "User doesn't exist.",
        });
    });

    // 4. 测试重置密码成功
    it("should respond with successful message when reseting is successful", async () => {
        const fastify = await initFastify();
        await userModel.createUser({
            username: testUsername,
            password: testPassword,
            nickname: testNickname
        });
        request.body = (
            JSON.stringify({
                oldPassword: testPassword,
                newPassword
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/user/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Password Reset Successfully.",
        });

        await userModel.removeUser(testUsername);
    });

    // 5. 测试旧密码错误
    it("should respond with \"Password wrong.\" when oldPassword is wrong", async () => {
        const fastify = await initFastify();
        await userModel.createUser({
            username: testUsername,
            password: testPassword,
            nickname: testNickname
        });
        request.body = (
            JSON.stringify({
                oldPassword: "old-password",
                newPassword
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/user/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Password wrong.",
        });

        await userModel.removeUser(testUsername);
    });

    // 4. 测试重置邮箱
    it("should respond with successful message when reseting is successful", async () => {
        const fastify = await initFastify();
        await userModel.createUser({
            username: testUsername,
            password: testPassword,
            nickname: testNickname
        });
        request.body = (
            JSON.stringify({
                oldPassword: testPassword,
                email: newEmail
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/user/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Email Edit Successfully.",
        });

        await userModel.removeUser(testUsername);
    });

    // 7. 异常处理
    it("should respond with \"Error Editing User. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "POST",
            url: "/api/user/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Editing User. Error: Invalid refresh token"
        });
    });
});