import { FastifyRequest } from "fastify";
import { userModel, friendshipModel, groupModel, groupMemberModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";

describe("DELETE /api/remove/group", () => {
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

    // 1. 成功退出群聊
    describe("Exit from group successfully", () => {
        // A. 群主退出，需要提供新任群主
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    master: testUsername2
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Exit from group successfully."
            });
        });

        // B. 管理员退出
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token2,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Exit from group successfully."
            });
        });

        // C. 普通成员退出
        it("should respond with successful message when exiting successfully", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token3,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Exit from group successfully."
            });
        });
    });

    // 2. 异常处理
    describe("Error exiting from group", () => {
        // A. 鉴权失败
        it("should respond with \"Error Exiting From Group. Error: ...\" when there is an error", async () => {
            const fastify = await initFastify();

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "invalid token",
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(500);
            expect(response.json()).toEqual({
                code: -1,
                msg: "Error Exiting From Group. Error: Invalid refresh token"
            });
        });

        // B. 群主退出但没给 master
        it("should respond with \"Error Exiting From Group. Error: ...\" when there is an error", async () => {
            const fastify = await initFastify();

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(500);
            expect(response.json()).toEqual({
                code: -1,
                msg: "Error Exiting From Group. SyntaxError: Unexpected end of JSON input"
            });
        });

        // C. 群主退出，但新任群主不在群中
        it("should respond with \"Error Exiting From Group. Error: ...\" when there is an error", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    master: "passer-by"
                })
            );

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "invalid token",
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(500);
            expect(response.json()).toEqual({
                code: -1,
                msg: "Error Exiting From Group. Error: Invalid refresh token"
            });
        });

        // D. 申请退出用户不在群中
        it("should respond with \"Error Exiting From Group. Error: ...\" when there is an error", async () => {
            const fastify = await initFastify();

            const response = await fastify.inject({
                method: "DELETE",
                url: "/api/remove/group",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token4
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(500);
            expect(response.json()).toEqual({
                code: -1,
                msg: "Error Exiting From Group. SyntaxError: Unexpected end of JSON input"
            });
        });
    });
});