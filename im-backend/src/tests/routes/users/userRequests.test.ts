import { FastifyRequest } from "fastify";
import { userModel, groupModel, groupMemberModel, groupApplicationModel, friendshipApplicationModel, initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";

describe("GET /api/list/friend", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    let token2: string;
    let token3: string;
    let testGroupID: ObjectId;
    let testGroupID2: ObjectId;
    const testGroupname = "test-groupname";
    const testUsername1 = "test-username1";
    const testPassword1 = "test-password1";
    const testNickname1 =  "test-nickname1";
    const testUsername2 = "test-username2";
    const testPassword2 = "test-password2";
    const testNickname2 =  "test-nickname2";
    const testReason = "test-reason";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
        await db.collection("group").deleteMany({});
        await db.collection("groupMember").deleteMany({});
        await db.collection("friendshipApplication").deleteMany({});
        await db.collection("groupApplication").deleteMany({});

        await userModel.init();
        await userModel.createUser({username: testUsername1, password: testPassword1, nickname: testNickname1});
        await userModel.createUser({username: testUsername2, password: testPassword2, nickname: testNickname2});

        await groupModel.init();
        const group = await groupModel.createGroup({groupname: testGroupname, master: testUsername2});
        testGroupID = group._id;
        const group2 = await groupModel.createGroup({groupname: testGroupname, master: testUsername1});
        testGroupID2 = group2._id;

        await groupMemberModel.init();
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername2, group_nickname: testUsername2, role: 0});
        await groupMemberModel.createGroupMember({ groupID: testGroupID2, username: testUsername1, group_nickname: testUsername1, role: 0});

        await friendshipApplicationModel.init();
        await groupApplicationModel.init();

        await friendshipApplicationModel.createFriendship({ sender: testUsername1, receiver: testUsername2, message: testReason });
        await friendshipApplicationModel.createFriendship({ sender: testUsername2, receiver: testUsername1, message: testReason });
        await groupApplicationModel.createGroupApplication({ groupID: testGroupID, username: testUsername1, message: testReason });
        await groupApplicationModel.createGroupApplication({ groupID: testGroupID2, username: testUsername2, message: testReason });
    });

    beforeEach(async () => {
        token1 = await getSignedToken(testUsername1);
        token2 = await getSignedToken(testUsername2);
        token3 = await getSignedToken("wrong username");
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

    afterAll(() => {
        userModel.close();
    });

    // 1. 顺利通过
    it("should return friend list when everything is right", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/list/request",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Successfully fetched user requests.",
            requests: [{
                    createTime: expect.any(String),
                    groupID: "",
                    groupname: "",
                    reason: testReason,
                    requestID: expect.any(String),
                    sender: testUsername1,
                    status: "pending",
                    type: "friend",
                    username: testUsername2
                }, {
                    createTime: expect.any(String),
                    groupID: "",
                    groupname: "",
                    reason: testReason,
                    requestID: expect.any(String),
                    sender: testUsername2,
                    status: "pending",
                    type: "friend",
                    username: testUsername1
                }, {
                    createTime: expect.any(String),
                    groupID: expect.any(String),
                    groupname: testGroupname,
                    reason: testReason,
                    requestID: expect.any(String),
                    sender: testUsername1,
                    status: "pending",
                    type: "group",
                    username: ""
                }, {
                    createTime: expect.any(String),
                    groupID: expect.any(String),
                    groupname: testGroupname,
                    reason: testReason,
                    requestID: expect.any(String),
                    sender: testUsername2,
                    status: "pending",
                    type: "group",
                    username: ""
                }]
        });
    });

    // 2. 测试用户不存在
    it("should respond with \"User doesn't exist.\" when the user doesn't exist", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/list/request",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token3,
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
    it("should respond with \"Error Fetching User Requests. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "GET",
            url: "/api/list/request",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Fetching User Requests. Error: Invalid refresh token",
            requests: []
        });
    });
});