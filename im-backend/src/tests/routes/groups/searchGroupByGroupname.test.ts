import { FastifyRequest } from "fastify";
import { groupModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";

describe("POST /api/search/group", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    const testUsername1 = "test-username1";
    const testUsername2 = "test-username2";
    const testGroupName = "test-groupname";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("group").deleteMany({});

        await groupModel.init();
        await groupModel.createGroup({groupname: testGroupName, master: testUsername1});
        await groupModel.createGroup({groupname: testGroupName, master: testUsername2});
    });

    beforeEach(async () => {
        token1 = await getSignedToken(testUsername1);

        request = {
            body: "",
            headers: {
                authorization: token1,
            }
        } as FastifyRequest<{ Body: string }>;
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await groupModel.close();
    });

    // 1. 成功获取
    it("should respond with successful message when they are friends", async () => {
        const fastify = await initFastify();

        request.body = JSON.stringify({
            groupname: testGroupName
        });

        const response = await fastify.inject({
            method: "POST",
            url: "/api/search/group",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            code: 0,
            msg: "Get group lists successfully.",
            groupList: [
                {
                    avatar: "",
                    groupID: expect.any(String),
                    groupname: testGroupName,
                },
                {
                    avatar: "",
                    groupID: expect.any(String),
                    groupname: testGroupName,
                },
            ]
        });
    });

    // 2. 异常处理
    it("should respond with \"Error Getting Group List. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "POST",
            url: "/api/search/group",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Getting Group List. Error: Invalid refresh token",
            groupList: []
        });
    });
});
