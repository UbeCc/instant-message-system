import { FastifyRequest } from "fastify";
import { userModel, groupModel, groupMemberModel, initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";

describe("GET /api/list/friend", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token: string;
    let token2: string;
    let testGroupID: ObjectId;
    const testUsername = "test-username";
    const testPassword = "test-password";
    const testNickname =  "test-nickname";
    const testGroupname = "test-groupname";
    const testGroupNickname = "test-groupnickname";
    const testRole = 2;

    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
        await db.collection("group").deleteMany({});
        await db.collection("groupMember").deleteMany({});

        await userModel.init();
        await userModel.createUser({ username: testUsername, password: testPassword, nickname: testNickname });

        await groupModel.init();
        const group = await groupModel.createGroup({ groupname: testGroupname, master: testUsername });
        testGroupID = group._id;

        await groupMemberModel.init();
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername, group_nickname: testGroupNickname, role: testRole });
        token = await getSignedToken(testUsername);
        token2 = await getSignedToken("passer-by");
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
    it("should return friend list when everything is right", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/list/group",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Successfully fetched user groups.",
            groups: [{
                avatar: "",
                cursor: expect.any(String),
                groupID: expect.any(String),
                groupname: testGroupname,
                userList: [testUsername],
                userCursors: [expect.any(String)]
            }]
        });
    });

    // 2. 测试用户不存在
    it("should respond with \"User doesn't exist.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/list/group",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token2,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            code: -1,
            msg: "User doesn't exist."
        });
    });

    // 3. 异常处理
    it("should respond with \"Error Fetching user profile. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/list/group",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Fetching User Groups. Error: Invalid refresh token",
            groups: []
        });
    });
});
