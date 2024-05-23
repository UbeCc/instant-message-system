import { FastifyRequest } from "fastify";
import { userModel, groupModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";

describe("POST /api/group/create", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    let token2: string;
    let testGroupID: ObjectId;
    const testUsername1 = "test-username1";
    const testGroupName = "test-groupname";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("group").deleteMany({});

        await groupModel.init();
        const group = await groupModel.createGroup({groupname: testGroupName, master: testUsername1});
        testGroupID = group._id;
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
        await userModel.close();
    });

    // 1. 成功获取群聊详情
    it("should respond with successful message when user are in the group", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/group/" + testGroupID.toString(),
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            code: 0,
            msg: "Get group details successfully.",
            group: {
                groupID: expect.any(String),
                groupname: testGroupName,
                avatar: "",
                createTime: expect.any(String),
                master: testUsername1,
                invite_check: false,
                admins: [],
                announcement: "",
                memberList: []
            }
        });
    });

    // 2. 群组不存在
    it("should respond with failed message when they are not friends", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/group/" + new ObjectId().toString(),
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
                msg: "Group doesn't exist."
        });
    });

    // 3. 异常处理
    it("should respond with \"Error Getting Group. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/group/" + testGroupID.toString(),
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Getting Group. Error: Invalid refresh token"
        });
    });
});
