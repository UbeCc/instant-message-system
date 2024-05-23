import { FastifyRequest, FastifyReply } from "fastify";
import { getToken } from "../../utils";
import { ObjectId } from "mongodb";
import { convMessageModel } from "../../server";

// DELETE /api/message/delete
/**
 * @summary 删除指定会话的指定消息
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export const deleteMsgHandler = async (request: FastifyRequest<{ Body: string }>, reply: FastifyReply) => {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { convID, msgID } = JSON.parse(request.body);

        await convMessageModel.deleteMessage(username, msgID, new ObjectId(convID as string));
        const response = JSON.stringify({
            code: 0,
            msg: "Delete massage successfully."
        });
        reply.send(response);
    } catch (error) {
        console.log(`Error Deleting Massage. ${error}`, error);
        reply.code(500).send({
            code: -1,
            msg: `Error Deleting Massage. ${error}`
        });
    }
};