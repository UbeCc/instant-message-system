import { FastifyRequest } from "fastify";
import { userModel, friendshipModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";

describe("DELETE /api/remove/friend", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    const testUsername1 = "test-username1";
    const testPassword1 = "test-password1";
    const testNickname1 =  "test-nickname1";
    const testUsername2 = "test-username2";
    const testPassword2 = "test-password2";
    const testNickname2 =  "test-nickname2";
    const testTag = "test-tag";

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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await friendshipModel.close();
        await userModel.close();
    });

    // 1. 修改分组成功
    it("should respond with successful message when they are friends", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                username: testUsername2,
                tag: testTag
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/tag",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Edit Tag successfullly!"
        });
    });

    // 2. 异常处理
    it("should respond with \"Error Editing Freind Tag.\" when there is an error", async () => {
        const fastify = await initFastify();

        request = {
            body: "",
            headers: {
                authorization: "invalid token",
            }
        } as FastifyRequest<{ Body: string }>;

        const response = await fastify.inject({
            method: "POST",
            url: "/api/tag",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Editing Freind Tag. Error: Invalid refresh token",
        });
    });
});
