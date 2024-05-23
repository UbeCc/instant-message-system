import { friendshipModel } from "../../server";
import { FastifyReply, FastifyRequest } from "fastify";
import { getToken } from "../../utils";

/**
 * @summary 修改好友分组

 * @route POST /api/tag

 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function editFreindTagHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const yourself = JSON.parse(JSON.stringify(decoded)).username;
        const { username, tag } = JSON.parse(request.body);
        // 修改分组
        await friendshipModel.editTag(yourself, username, tag);

        const response = JSON.stringify({
            code: 0,
            msg: "Edit Tag successfullly!"
        });
        return reply.send(response);
    } catch (error) {
        console.error(`Error Editing Freind Tag. ${error}`, error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error Editing Freind Tag. ${error}`
        });
        return reply.code(500).send(response);
    }
}