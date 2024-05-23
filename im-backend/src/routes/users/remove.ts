import { userModel } from "../../server";
import { FastifyRequest, FastifyReply } from "fastify";
import { getToken } from "../../utils";


/**
 * @summary 注销用户
 * @route DELETE /api/remove/user
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function deleteUserHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const result = await userModel.removeUser(username);
        if (result) {
            const response = JSON.stringify({
                code: 0,
                msg: "Delete user successfully."
            });
            return reply.send(response);
        } else {
            const response = JSON.stringify({
                code: -1,
                msg: "The user doesn't exist."
            });
            return reply.status(400).send(response);
        }
    } catch (error) {
        // 未知错误处理
        console.error("Error deleting user.", error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error deleting user. ${error}`
        });
        return reply.status(500).send(response);
    }
}