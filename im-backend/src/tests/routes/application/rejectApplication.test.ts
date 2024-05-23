import { FastifyRequest } from "fastify";
import { userModel, friendshipModel, friendshipApplicationModel, groupModel, groupApplicationModel, groupMemberModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";

describe("POST /api/request/reject", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    let token2: string;
    let tokenMaster: string;
    let tokenAdmin: string;
    let testGroupID: ObjectId;
    const testGroupname = "test-groupname";
    const testUsername1 = "test-username1";
    const testPassword1 = "test-password1";
    const testNickname1 =  "test-nickname1";
    const testUsername2 = "test-username2";
    const testPassword2 = "test-password2";
    const testNickname2 =  "test-nickname2";
    const testMaster = "test-master";
    const testAdmin = "test-admin";
    const testReason = "test-reason";
    const testRejectReason = "test-reject-reason";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
        await db.collection("group").deleteMany({});
        await db.collection("groupMember").deleteMany({});

        await userModel.init();
        await userModel.createUser({username: testUsername1, password: testPassword1, nickname: testNickname1});
        await userModel.createUser({username: testUsername2, password: testPassword2, nickname: testNickname2});

        await groupModel.init();
        const group = await groupModel.createGroup({groupname: testGroupname, master: testUsername2});
        testGroupID = group._id;

        await groupMemberModel.init();
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testMaster, group_nickname: testMaster, role: 0});
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testAdmin, group_nickname: testAdmin, role: 1});
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername2, group_nickname: testUsername2, role: 2});

        await friendshipModel.init();
        await friendshipApplicationModel.init();
        await groupApplicationModel.init();
    });

    beforeEach(async () => {
        const db = await connectToDatabase();
        await db.collection("friendship").deleteMany({});
        await db.collection("friendshipApplication").deleteMany({});
        await db.collection("groupApplication").deleteMany({});
        token1 = await getSignedToken(testUsername1);
        token2 = await getSignedToken(testUsername2);
        tokenMaster = await getSignedToken(testMaster);
        tokenAdmin = await getSignedToken(testAdmin);

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
        friendshipModel.close();
    });

    // 1. 拒绝好友申请
    describe("rejectFriendRequestHandler()", () => {
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();
            const application = await friendshipApplicationModel.createFriendship({ sender: testUsername1, receiver: testUsername2, message: testReason });
            const testRequestID = application._id;

            request.body = (
                JSON.stringify({
                    reason: testRejectReason,
                    requestID: testRequestID,
                    type: "friend"
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/request/reject",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token2,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Application reject successfully."
            });
            const db = await connectToDatabase();
            const rejectedApplication = await db.collection("friendshipApplication").findOne({ _id: testRequestID });
            expect(rejectedApplication?.status).toBe("rejected");
            expect(rejectedApplication?.reject_reason).toBe(testRejectReason);
        });
    });

    // 2. 拒绝入群申请
    describe("rejectGroupRequestHandler()", () => {
        // A. 群主审核，应当通过
        it("should respond with failed message when they are not friends", async () => {
            const fastify = await initFastify();
            const application = await groupApplicationModel.createGroupApplication({ groupID: testGroupID, username: testUsername1, message: testReason });
            const testRequestID = application._id;

            request.body = (
                JSON.stringify({
                    requestID: testRequestID,
                    groupID: testGroupID,
                    reason: testRejectReason,
                    type: "group"
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/request/reject",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": tokenMaster,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Application reject successfully."
            });
            const db = await connectToDatabase();
            const rejectedApplication = await db.collection("groupApplication").findOne({ _id: testRequestID });
            expect(rejectedApplication?.status).toBe("rejected");
            expect(rejectedApplication?.reject_reason).toBe(testRejectReason);
        });

        // B. 管理员审核，应当通过
        it("should respond with failed message when they are not friends", async () => {
            const fastify = await initFastify();
            const application = await groupApplicationModel.createGroupApplication({ groupID: testGroupID, username: testUsername1, message: testReason });
            const testRequestID = application._id;

            request.body = (
                JSON.stringify({
                    requestID: testRequestID,
                    groupID: testGroupID,
                    reason: testRejectReason,
                    type: "group"
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/request/reject",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": tokenAdmin,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Application reject successfully."
            });
            const db = await connectToDatabase();
            const rejectedApplication = await db.collection("groupApplication").findOne({ _id: testRequestID });
            expect(rejectedApplication?.status).toBe("rejected");
            expect(rejectedApplication?.reject_reason).toBe(testRejectReason);
        });

        // C. 普通成员审核，不应当通过
        it("should respond with failed message when they are not friends", async () => {
            const fastify = await initFastify();
            const application = await groupApplicationModel.createGroupApplication({ groupID: testGroupID, username: testUsername1, message: testReason });
            const testRequestID = application._id;

            request.body = (
                JSON.stringify({
                    requestID: testRequestID,
                    groupID: testGroupID,
                    reason: testRejectReason,
                    type: "group"
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/request/reject",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token2,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({
                code: -1,
                msg: "The examiner must be a master or an admin."
            });
        });

        // D. 非群员审核，不应当通过
        it("should respond with failed message when they are not friends", async () => {
            const fastify = await initFastify();
            const application = await groupApplicationModel.createGroupApplication({ groupID: testGroupID, username: testUsername1, message: testReason });
            const testRequestID = application._id;

            request.body = (
                JSON.stringify({
                    requestID: testRequestID,
                    groupID: testGroupID,
                    reason: testRejectReason,
                    type: "group"
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/request/reject",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({
                code: -1,
                msg: "The examiner doesn't belong to the group."
            });
        });
    });

    // 3. 非法类型申请（not "group" or "friend"）
    it("should respond with \"'type' can only be 'group' or 'friend'\" when 'type' is not 'group' or 'friend'", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                type: "invalid type"
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/request/reject",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            code: -1,
            msg: "'type' can only be 'group' or 'friend'."
        });
    });

    // 4. 异常处理
    it("should respond with \"Error Rejecting Request. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "POST",
            url: "/api/request/reject",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Rejecting Request. Error: Invalid refresh token"
        });
    });
});