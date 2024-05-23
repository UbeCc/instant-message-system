import { FastifyRequest } from "fastify";
import { userModel, groupModel, groupMemberModel } from "../../../server";
import { initFastify } from "../../../server";
import { getSignedToken } from "../../../utils";
import { connectToDatabase } from "../../../models/database";
import { ObjectId } from "mongodb";

describe("POST /api/group/create", () => {
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
    const testAvatar = "https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png";
    const testAnnouncement = "test-announcement";

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("group").deleteMany({});

        await groupModel.init();
        const group = await groupModel.createGroup({groupname: testGroupName, master: testUsername1});
        testGroupID = group._id;

        await groupMemberModel.init();
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername1, group_nickname: testUsername1, role: 0});
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername2, group_nickname: testUsername2, role: 1});
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername3, group_nickname: testUsername3, role: 2});
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
        await db.collection("group").updateOne({_id: testGroupID}, {$set: {master: testUsername1}});
        await db.collection("groupMember").updateOne({groupID: testGroupID, username: testUsername3}, {$set: {role: 2}});
        await db.collection("groupMember").updateOne({groupID: testGroupID, username: testUsername2}, {$set: {role: 1}});
        await db.collection("groupMember").updateOne({groupID: testGroupID, username: testUsername1}, {$set: {role: 0}});
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await userModel.close();
    });

    // 1. 群主可编辑
    it("should respond with successful message when they are friends", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                groupID: testGroupID,
                groupname: testGroupName,
                avatar: testAvatar,
                invite_check: false,
                announcement: testAnnouncement
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/group/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token1,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Edit group successfully.",
            group: expect.objectContaining({
                groupID: expect.any(String),
                groupname: testGroupName,
                avatar: testAvatar,
                invite_check: false,
                announcement: testAnnouncement,
                master: testUsername1,
                admins: [],
                createTime: expect.any(String)
            })
        });
    });

    // 2. 管理员可编辑
    it("should respond with successful message when they are friends", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                groupID: testGroupID,
                groupname: testGroupName,
                avatar: testAvatar,
                invite_check: false,
                announcement: testAnnouncement
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/group/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token2,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            code: 0,
            msg: "Edit group successfully.",
            group: expect.objectContaining({
                groupID: expect.any(String),
                groupname: testGroupName,
                avatar: testAvatar,
                invite_check: false,
                announcement: testAnnouncement,
                master: testUsername1,
                admins: [],
                createTime: expect.any(String)
            })
        });
    });

    // 3. 普通成员不可编辑
    it("should respond with failed message when they are not friends", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                groupID: testGroupID,
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/group/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token3,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            code: -1,
            msg: "You are not allowed to edit this group."
        });
    });

    // 4. 非成员不可编辑
    it("should respond with failed message when they are not friends", async () => {
        const fastify = await initFastify();

        request.body = (
            JSON.stringify({
                groupID: testGroupID,
            })
        );

        const response = await fastify.inject({
            method: "POST",
            url: "/api/group/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token4,
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            code: -1,
            msg: "You are not in this group."
        });
    });

    // 5. 异常处理
    it("should respond with \"Error Editing Group. Error: ...\" when there is an error", async () => {
        const fastify = await initFastify();

        const response = await fastify.inject({
            method: "POST",
            url: "/api/group/edit",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "invalid token",
            },
            payload: JSON.stringify(request.body)
        });

        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
            code: -1,
            msg: "Error Editing Group. Error: Invalid refresh token"
        });
    });

    // 6. 转让群主
    describe("transferMaster", () => {
        // A. 群主去执行，转让成功
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    groupname: testGroupName,
                    avatar: testAvatar,
                    invite_check: false,
                    announcement: testAnnouncement,
                    master: testUsername2
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/group/edit",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Edit group successfully.",
                group: expect.objectContaining({
                    groupID: expect.any(String),
                    groupname: testGroupName,
                    avatar: testAvatar,
                    invite_check: false,
                    announcement: testAnnouncement,
                    master: testUsername2,
                    admins: [],
                    createTime: expect.any(String)
                })
            });
        });

        // B. 非群主去执行，转让失败
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    groupname: testGroupName,
                    avatar: testAvatar,
                    invite_check: false,
                    announcement: testAnnouncement,
                    master: testUsername2
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/group/edit",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token2,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(403);
            expect(response.json()).toEqual({
                    code: -1,
                    msg: "You are not master, so you can't transfer master."
            });
        });
    });

    // 7. 编辑管理员
    describe("editAdmin", () => {
        // A. 群主去执行，编辑成功
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    groupname: testGroupName,
                    avatar: testAvatar,
                    invite_check: false,
                    announcement: testAnnouncement,
                    admins: [testUsername3]
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/group/edit",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token1,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                code: 0,
                msg: "Edit group successfully.",
                group: expect.objectContaining({
                    groupID: expect.any(String),
                    groupname: testGroupName,
                    avatar: testAvatar,
                    invite_check: false,
                    announcement: testAnnouncement,
                    master: testUsername1,
                    admins: [testUsername3],
                    createTime: expect.any(String)
                })
            });
        });

        // B. 非群主去执行，编辑失败
        it("should respond with successful message when they are friends", async () => {
            const fastify = await initFastify();

            request.body = (
                JSON.stringify({
                    groupID: testGroupID,
                    groupname: testGroupName,
                    avatar: testAvatar,
                    invite_check: false,
                    announcement: testAnnouncement,
                    admins: [testUsername3]
                })
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/api/group/edit",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token2,
                },
                payload: JSON.stringify(request.body)
            });

            expect(response.statusCode).toBe(403);
            expect(response.json()).toEqual({
                    code: -1,
                    msg: "You are not master, so you can't edit admins."
            });
        });
    });
});