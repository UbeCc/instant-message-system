import { FastifyRequest, FastifyReply } from "fastify";
import { convMessageModel } from "../../server";
import { getToken } from "../../utils";
import { ObjectId } from "mongodb";

/**
 * @summary 获取指定会话、指定时间段的聊天记录
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export const getMsgByTimeHandler = async (request: FastifyRequest<{ Body: string }>, reply: FastifyReply) => {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { convID, startTime, finishTime } = JSON.parse(request.body);

        const msgList = await convMessageModel.getMessageByTime(username, new ObjectId(convID as string), new Date(startTime), new Date(finishTime));
        const response = JSON.stringify({
            code: 0,
            msg: "get message list by time successfully.",
            msgList
        });
        reply.send(response);
    } catch (error) {
        console.log(`Error Getting Message By Time. ${error}`, error);
        reply.code(500).send({
            code: -1,
            msg: `Error Getting Message By Time. ${error}`,
            msgList: []
        });
    }
};