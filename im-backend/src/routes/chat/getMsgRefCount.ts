import { FastifyRequest, FastifyReply } from "fastify";
import { getToken } from "../../utils";
import { ObjectId } from "mongodb";
import { convMessageModel } from "../../server";

// POST /api/message/refer
/**
 * @summary 获取指定会话的某条信息引用数
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export const getMsgRefCountHandler = async (request: FastifyRequest<{ Body: string }>, reply: FastifyReply) => {
    try {
        await getToken(request);
        const { convID, msgID } = JSON.parse(request.body);

        const { refCount, refMessage } = await convMessageModel.getRefMessage(new ObjectId(convID as string), msgID);
        const response = JSON.stringify({
            code: 0,
            msg: "Get message reference count successfully.",
            refCount,
            refMessage
        });
        reply.send(response);
    } catch (error) {
        console.log(`Error Getting Message Reference Count. ${error}`, error);
        reply.code(500).send({
            code: -1,
            msg: `Error Getting Message Reference Count. ${error}`,
            refCount: 0,
            refMessage:  null
        });
    }
};