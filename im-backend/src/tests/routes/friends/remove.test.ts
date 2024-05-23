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
    });

    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("friendship").deleteMany({});
        token1 = await getSignedToken(testUsername1);
        token2 = await getSignedToken(testUsername2);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        friendshipModel.close();
    });

    // 1. 顺利删除好友(删除提出者为 sender)
    it("should respond with successful message when deleting is successful", async () => {
        const fastify = await initFastify();
        await friendshipModel.createFriendship({
            sender: testUsername1,
            receiver: testUsername2
        });

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
            method: "DELETE",
            url: "/api/remove/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Delete friendship successfully.",
        });
    });

    // 2. 顺利删除好友(删除提出者为 receiver)
    it("should respond with successful message when deleting is successful", async () => {
        const fastify = await initFastify();
        await friendshipModel.createFriendship({
            sender: testUsername1,
            receiver: testUsername2
        });

        request = {
            body: "",
            headers: {
                authorization: token2,
            }
        } as FastifyRequest<{ Body: string }>;
        request.body = (
            JSON.stringify({
                username: testUsername1
            })
        );

        const response = await fastify.inject({
            method: "DELETE",
            url: "/api/remove/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token2,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Delete friendship successfully.",
        });
    });


    // 3. 二者非好友关系
    it("should respond with \"They are not friends.\" when They are not friends", async () => {
        const fastify = await initFastify();
        await friendshipModel.createFriendship({
            sender: testUsername1,
            receiver: testUsername2
        });

        request = {
            body: "",
            headers: {
                authorization: token2,
            }
        } as FastifyRequest<{ Body: string }>;
        request.body = (
            JSON.stringify({
                username: "passer-by"
            })
        );

        const response = await fastify.inject({
            method: "DELETE",
            url: "/api/remove/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token2,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "They are not friends.",
        });
    });

    // 4. 异常处理
    it("should respond with \"Error deleting friendship. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "DELETE",
            url: "/api/remove/friend",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error deleting friendship. Error: Invalid refresh token"
        });
    });
});