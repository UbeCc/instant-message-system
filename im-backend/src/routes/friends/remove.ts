import { friendshipModel } from "../../server";
import { FastifyRequest, FastifyReply } from "fastify";
import { getToken } from "../../utils";

/**
 * @summary 删除好友

 * @route DELETE /api/remove/friend

 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function deleteFriendHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const friendname  = JSON.parse(request.body).username;

        const result = await friendshipModel.deleteFriendship(username, friendname);

        if (result) {
            const response = JSON.stringify({
                code: 0,
                msg: "Delete friendship successfully."
            });
            return reply.send(response);
        } else {
            const response = JSON.stringify({
                code: -1,
                msg: "They are not friends."
            });
            return reply.status(400).send(response);
        }
    } catch (error) {
        // 未知错误处理
        console.error(`Error deleting friendship. ${error}`, error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error deleting friendship. ${error}`
        });
        return reply.status(500).send(response);
    }
}