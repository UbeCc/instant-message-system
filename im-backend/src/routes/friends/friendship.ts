import { friendshipModel } from "../../server";
import { FastifyReply, FastifyRequest } from "fastify";
import { getToken } from "../../utils";

/**
 * @summary 验证是否为好友

 * @route POST /api/check/friend

 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function checkFriendshipHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const yourself = JSON.parse(JSON.stringify(decoded)).username;
        const username = JSON.parse(request.body).username;
        // 检查好友关系是否存在
        const result = await friendshipModel.checkFriendshipExists(yourself, username);
        const tag = result?.tag;
        const friendshipID = result?.friendshipID;

        if (tag !== null) {
            const response = JSON.stringify({
                code: 0,
                msg: "They are friends!",
                result: true,
                tag,
                friendshipID
            });
            return reply.send(response);
        } else {
            const response = JSON.stringify({
                code: 0,
                msg: "They are not friends.",
                result: false,
                tag,
                friendshipID: ""
            });
            return reply.send(response);
        }
    } catch (error) {
        console.error(`Error Checking Friendship. ${error}`, error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error Checking Friendship. ${error}`,
        });
        return reply.code(500).send(response);
    }
}