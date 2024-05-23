import { FastifyRequest, FastifyReply } from "fastify";
import { groupModel, groupMemberModel } from "../../server";
import { getToken } from "../../utils";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../models/database";

/**
 * @summary 获取指定群的详细信息
 * @route GET /api/group
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function getGroupDetailsHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        await getToken(request);
        const params: any = request.params;
        const groupID: string = params.groupID;

        const groupDetails = await groupModel.getGroupInfoByGroupId(new ObjectId(groupID));

        if (!groupDetails) {
            const response = JSON.stringify({
                code: -1,
                msg: "Group doesn't exist."
            });
            reply.status(400).send(response);
        } else {
            const group = {
                groupID: groupDetails._id.toString(),            // 群 ID
                groupname: groupDetails.groupname,              // 群名称
                master: groupDetails.master,                      // 群主的 username
                admins: groupDetails.admins,                      // 管理员 username 列表
                avatar: groupDetails.avatar,                      // 群头像
                createTime: groupDetails.createTime,            // 建群时间
                invite_check: groupDetails.invite_check,          // 邀请是否需要审核（默认为 true ）
                announcement: groupDetails.announcement,           // 群公告
                memberList: groupDetails.memberList            // 群成员 username 列表
            };
            const response = JSON.stringify({
                code: 0,
                msg: "Get group details successfully.",
                group
            });
            return reply.send(response);
        }
    } catch (error) {
        // 未知错误处理
        console.error(`Error Getting Group. ${error}`, error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error Getting Group. ${error}`
        });
        return reply.status(500).send(response);
    }
}

async function editGroup(role: number, groupID: string, groupname: string, avatar: string, inviteCheck: boolean, announcement: string) {
    if (role === 1 || role === 0) {           // 若是群主或管理员，允许修改
        await groupModel.editGroup(new ObjectId(groupID), groupname, avatar, inviteCheck, announcement);
        const db = await connectToDatabase();
        const groupInfo = await db.collection("group").findOne({ _id: new ObjectId(groupID) });
        if (!groupInfo) {
            const response = JSON.stringify({
                code: -1,
                msg: "Group doesn't exist."
            });
            return {
                statusCode: 400,
                response
            };
        } else {
            const group = {
                groupID: groupInfo._id.toString(),             // 群 ID
                groupname: groupInfo.groupname,                // 群名称
                master: groupInfo.master,                      // 群主的 username
                admins: groupInfo.admins,                      // 管理员 username 列表
                avatar: groupInfo.avatar,                      // 群头像
                createTime: groupInfo.createTime,              // 建群时间
                invite_check: groupInfo.invite_check,          // 邀请是否需要审核（默认为 true ）
                announcement: groupInfo.announcement           // 群公告
            };
            const response = JSON.stringify({     // 编辑成功
                code: 0,
                msg: "Edit group successfully.",
                group
            });
            return {
                statusCode: 200,
                response
            };
        }
    } else if (role === 2) {                  // 若是普通群成员，提示无编辑权限
        const response = JSON.stringify({
            code: -1,
            msg: "You are not allowed to edit this group."
        });
        return {
            statusCode: 403,
            response
        };
    } else {
        const response = JSON.stringify({     // 若查找失败，提示该用户不在群中
            code: -1,
            msg: "You are not in this group."
        });
        return {
            statusCode: 403,
            response
        };
    }
}

/**
 * @summary 修改群信息
 * @route POST /api/group/edit
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function editGroupHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { groupID, groupname, avatar, invite_check, announcement, master, admins } = JSON.parse(request.body);

        const role = await groupMemberModel.getRole(new ObjectId(groupID as string), username);
        if (master) {
            if (role === 0){
                await groupModel.transferMaster(new ObjectId(groupID as string), username, master);
            } else {
                const response = JSON.stringify({
                    code: -1,
                    msg: "You are not master, so you can't transfer master."
                });
                reply.status(403).send(response);
                return;
            }
        }
        if (admins) {
            if (role === 0){
                await groupModel.editAdmin(new ObjectId(groupID as string), username, admins);
            } else {
                const response = JSON.stringify({
                    code: -1,
                    msg: "You are not master, so you can't edit admins."
                });
                reply.status(403).send(response);
                return;
            }
        }
        const result = await editGroup(role, groupID, groupname, avatar, invite_check, announcement);
        reply.status(result.statusCode).send(result.response);
    } catch (error) {
        console.error(`Error Editing Group. ${error}`, error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error Editing Group. ${error}`
        });
        reply.status(500).send(response);
    }
}

/**
 * @summary 查找 groupname 一样的所有群
 * @route GET /api/search/group
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
*/
export async function searchGroupHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        await getToken(request);
        const groupname = JSON.parse(request.body).groupname;
        const groupList = await groupModel.getGroupByGroupname(groupname);
        const response = JSON.stringify({
            code: 0,
            msg: "Get group lists successfully.",
            groupList
        });
        reply.send(response);

    } catch (error) {
        console.error(`Error Getting Group List. ${error}`, error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error Getting Group List. ${error}`,
            groupList: []
        });
        reply.status(500).send(response);
    }
}