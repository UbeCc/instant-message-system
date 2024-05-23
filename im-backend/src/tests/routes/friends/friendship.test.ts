import { FastifyRequest } from "fastify";
import { userModel, friendshipModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";

describe("DELETE /api/remove/friend", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    let token2: string;
    const testUsername1 = "test-username1";
    const testPassword1 = "test-password1";
    const testNickname1 =  "test-nickname1";
    const testUsername2 = "test-username2";
    const testPassword2 = "test-password2";
    const testNickname2 =  "test-nickname2";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});

        await userModel.init();
        await userModel.createUser({username: testUsername1, password: testPassword1, nickname: testNickname1});
        await userModel.createUser({username: testUsername2, password: testPassword2, nickname: testNickname2});

        await friendshipModel.init();
    });

    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("friendship").deleteMany({});
        token1 = await getSignedToken(testUsername1);
        token2 = await getSignedToken(testUsername2);

        await friendshipModel.createFriendship({
            sender: testUsername1,
            receiver: testUsername2
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        friendshipModel.close();
    });

    // 1. 好友关系存在
    it("should respond with successful message when they are friends", async () => {
        const fastify = await initFastify();

        request = {
            body: "",
            headers: {
                authorization: token1,
            }
        } as FastifyRequest<{ Body: string }>;
        request.body = (
            JSON.stringify({
                username: testUsername2
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/check/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "They are friends!",
            result: true,
            tag: "",
            friendshipID: expect.any(String)
        });
    });

    // 2. 好友关系不存在
    it("should respond with failed message when they are not friends", async () => {
        const fastify = await initFastify();

        request = {
            body: "",
            headers: {
                authorization: token1,
            }
        } as FastifyRequest<{ Body: string }>;
        request.body = (
            JSON.stringify({
                username: "passer-by"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/check/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "They are not friends.",
            result: false,
            tag: null,
            friendshipID: ""
        });
    });

    // 3. 异常处理
    it("should respond with \"Error Checking Friendship\" when there is an error", async () => {
        const fastify = await initFastify();

        request = {
            body: "",
            headers: {
                authorization: "invalid token",
            }
        } as FastifyRequest<{ Body: string }>;
        request.body = (
            JSON.stringify({
                username1: testUsername1,
                username2: "passer-by"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/check/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Checking Friendship. Error: Invalid refresh token",
        });
    });
});
