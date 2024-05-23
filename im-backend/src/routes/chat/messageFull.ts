import { FastifyRequest, FastifyReply } from "fastify";
import { convMessageModel } from "../../server";
import { getToken } from "../../utils";
import { ObjectId } from "mongodb";

/**
 * @summary 获取指定会话的全量聊天记录
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export const getFullMsgHandler = async (request: FastifyRequest<{ Body: string }>, reply: FastifyReply) => {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { convID } = JSON.parse(request.body);

        const msgList = await convMessageModel.getFullMessage(username, new ObjectId(convID as string));
        const response = JSON.stringify({
            code: 0,
            msg: "Get message full message list by convID successfully.",
            msgList
        });
        reply.send(response);
    } catch (error) {
        console.log(`Error Getting Full Message. ${error}`, error);
        reply.code(500).send({
            code: -1,
            msg: `Error Getting Full Message. ${error}`,
            msgList: []
        });
    }
};