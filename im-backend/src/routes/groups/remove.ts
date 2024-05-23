import { groupMemberModel } from "../../server";
import { FastifyRequest, FastifyReply } from "fastify";
import { getToken } from "../../utils";
import { ObjectId } from "mongodb";

/**
 * @summary 退出群聊
 * @route DELETE /api/remove/group
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function exitGroupHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { groupID, master } = JSON.parse(request.body);

        await groupMemberModel.exitGroup(new ObjectId(groupID as string), username, master);
        const response = JSON.stringify({
            code: 0,
            msg: "Exit from group successfully."
        });
        reply.send(response);
    } catch (error) {
        console.error(`Error Exiting From Group. ${error}`, error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error Exiting From Group. ${error}`
        });
        reply.status(500).send(response);
    }
}

/**
 * @summary 删除群成员（需要群主或管理员权限，且只能删除普通成员）
 * @route POST /api/remove/group/member
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function deleteGroupMembersHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { groupID, memberName } = JSON.parse(request.body);

        const result = await groupMemberModel.deleteGroupMember(new ObjectId(groupID as string), username, memberName);

        if (result === 0) {
            const response = JSON.stringify({
                code: 0,
                msg: "Delete group member successfully."
            });
            return reply.send(response);
        } else if (result === 1) {
            const response = JSON.stringify({
                code: -1,
                msg: "Cannot delete master or admins."
            });
            return reply.status(403).send(response);
        } else if (result === 2) {
            const response = JSON.stringify({
                code: -1,
                msg: "You must be master or admin."
            });
            return reply.status(403).send(response);
        }
    } catch (error) {
        console.error(`Error Deleting Group Member. ${error}`, error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error Deleting Group Member. ${error}`
        });
        return reply.status(500).send(response);
    }
}