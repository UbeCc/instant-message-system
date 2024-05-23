import { FastifyRequest } from "fastify";
import { userModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";

describe("POST /api/search/user", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token: string;
    let token3: string;
    const testUsername1 = "test-username1";
    const testPassword1 = "test-password1";
    const testNickname1 = "test-nickname1";
    const testUsername2 = "test-username2";
    const testPassword2 = "test-password2";
    const testNickname2 = "test-nickname2";
    const testAvatar = "https://api.dicebear.com/7.x/miniavs/svg?seed=1";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});

        await userModel.init();
        await userModel.createUser({ username: testUsername1, password: testPassword1, nickname: testNickname1 });
        await userModel.createUser({ username: testUsername2, password: testPassword2, nickname: testNickname2 });
    });

    beforeEach(async () => {
        token = await getSignedToken(testUsername1);
        token3 = await getSignedToken("wrong username");
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
        request.body = (
            JSON.stringify({
                nickname: testNickname2
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/search/user",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Friend found.",
            userList: [{
                username: testUsername2,
                nickname: testNickname2,
                avatar: testAvatar
            }]
        });
    });

    // 2. 用户不存在
    it("should respond with \"User doesn't exist.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();
        request.body = (
            JSON.stringify({
                nickname: testNickname2
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/search/user",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token3,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "User doesn't exist."
        });
    });

    // 3. 异常处理
    it("should respond with \"Error Searching For User. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "POST",
            url: "/api/search/user",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Searching For User. Error: Invalid refresh token"
        });
    });
});