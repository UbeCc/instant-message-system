import { FastifyRequest, FastifyReply } from "fastify";
import { convMessageModel } from "../../server";
import { getToken } from "../../utils";
import { ObjectId } from "mongodb";

/**
 * @summary 获取指定会话、指定发送者的聊天记录
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export const getMsgBySenderHandler = async (request: FastifyRequest<{ Body: string }>, reply: FastifyReply) => {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { convID, sender } = JSON.parse(request.body);
        const msgList = await convMessageModel.getMessageBySender(username, new ObjectId(convID as string), sender);
        console.log("SENDER", convID, sender, msgList);
        const response = JSON.stringify({
            code: 0,
            msg: "get message list by sender successfully.",
            msgList
        });
        reply.send(response);
    } catch (error) {
        console.log(`Error Getting Message By Sender. ${error}`, error);
        reply.code(500).send({
            code: -1,
            msg: `Error Getting Message By Sender. ${error}`,
            msgList: []
        });
    }
};