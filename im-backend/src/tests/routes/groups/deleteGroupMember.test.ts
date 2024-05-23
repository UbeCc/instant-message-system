import { FastifyRequest } from "fastify";
import { userModel, friendshipModel, groupModel, groupMemberModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";

describe("DELETE /api/remove/group/member", () => {
    let request: FastifyRequest<{ Body: string }>;
    let token1: string;
    let token2: string;
    let token3: string;
    let token4: string;
    let testGroupID: ObjectId;
    const testUsername1 = "test-username1";
    const testUsername2 = "test-username2";
    const testUsername3 = "test-username3";
    const testGroupName = "test-groupname";

    beforeAll(async () => {
        await groupModel.init();
        await groupMemberModel.init();
    });

    beforeEach(async () => {
        token1 = await getSignedToken(testUsername1);
        token2 = await getSignedToken(testUsername2);
        token3 = await getSignedToken(testUsername3);
        token4 = await getSignedToken("wrong username");

        request = {
            body: "",
            headers: {
                authorization: token1,
            }
        } as FastifyRequest<{ Body: string }>;

        const db = await connectToDatabase();
        await db.collection("group").deleteMany({});
        const group = await groupModel.createGroup({groupname: testGroupName, master: testUsername1});
        testGroupID = group._id;

        await db.collection("groupMember").deleteMany({});
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername1, group_nickname: testUsername1, role: 0});
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername2, group_nickname: testUsername2, role: 1});
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername3, group_nickname: testUsername3, role: 2});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        groupModel.close();
    });

    // 1. 群主移除成员
    describe("Master carry out deleting", () => {
        // A. 可以移除管理员
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    memberName : testUsername2
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group/member",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Delete group member successfully."
            });
        });

        // B. 可以移除普通成员
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    memberName : testUsername3
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group/member",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Delete group member successfully."
            });
        });

        // C. 不能移除自己
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    memberName : testUsername1
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group/member",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(403);
            expect(response.json()).toEqual({
                code: -1,
                msg: "Cannot delete master or admins."
            });
        });
    });

    // 2. 管理员移除成员
    describe("Admin carry out deleting", () => {
        // A. 不可以移除管理员
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    memberName : testUsername2
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group/member",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token2,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(403);
            expect(response.json()).toEqual({
                code: -1,
                msg: "Cannot delete master or admins."
            });
        });

        // B. 可以移除普通成员
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    memberName : testUsername3
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group/member",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token2,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Delete group member successfully."
            });
        });

        // C. 不能移除群主
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    memberName : testUsername1
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group/member",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token2,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(403);
            expect(response.json()).toEqual({
                code: -1,
                msg: "Cannot delete master or admins."
            });
        });
    });

    // 2. 普通成员没有移除权限
    describe("Ordinary member carry out deleting", () => {
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    memberName : testUsername2
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group/member",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token3,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(403);
            expect(response.json()).toEqual({
                code: -1,
                msg: "You must be master or admin."
            });
        });
    });


    // 2. 异常处理
    describe("Error exiting from group", () => {
        // A. 鉴权失败
        it("should respond with \"Error Deleting Group Member. Error: ...\" when there is an error", async () => {
            const fastify = await initFastify();

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group/member",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "invalid token",
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(500);
            expect(response.json()).toEqual({
                code: -1,
                msg: "Error Deleting Group Member. Error: Invalid refresh token"
            });
        });

        // B. 待删除者不在群中
        it("should respond with \"Error Exiting From Group. Error: ...\" when there is an error", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    memberName : "passer-by"
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group/member",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(500);
            expect(response.json()).toEqual({
                code: -1,
                msg: "Error Deleting Group Member. Error: Deleting group members failed. Error: At least one of the two isn't in the group."
            });
        });
    });
});