import { FastifyRequest, FastifyReply } from "fastify";
import { getToken } from "../utils";
import { acceptFriendRequestHandler, rejectFriendRequestHandler, sendFriendRequestHandler } from "./friends/friendshipApplication";
import { acceptGroupRequestHandler, rejectGroupRequestHandler, sendGroupRequestHandler } from "./groups/groupApplication";

const wrongType = JSON.stringify({
    code: -1,
    msg: "'type' can only be 'group' or 'friend'."
});

/**
 * @summary 发送好友/入群申请

 * @route POST /api/request/send

 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function sendRequestHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { sender, groupID, receiver, type, reason } = JSON.parse(request.body);

        if (type === "group") {  // 申请入群
            await sendGroupRequestHandler(sender, groupID, reason, reply);
        } else if (type === "friend") {  // 申请好友关系
            await sendFriendRequestHandler(username, receiver, reason, reply);
        } else {
            return reply.code(400).send(wrongType);
        }
    } catch (error) {
        console.log(`Error Sending Request. ${error}`);
        return reply.status(500).send({
            code: -1,
            msg: `Error Sending Request. ${error}`
        });
    }
}

/**
 * @summary 通过好友/入群申请

 * @route POST /api/request/apply

 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function acceptRequestHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { sender, type, requestID, groupID } = JSON.parse(request.body);

        if (type === "group") {  // 入群申请
            await acceptGroupRequestHandler(username, sender, requestID, groupID, reply);
        } else if (type === "friend") {  // 好友申请
            await acceptFriendRequestHandler(username, sender, requestID, reply);
        } else {
            return reply.code(400).send(wrongType);
        }
    } catch (error) {
        console.log(`Error Accepting Request. ${error}`);
        return reply.status(500).send({
            code: -1,
            msg: `Error Accepting Request. ${error}`
        });
    }
}

/**
 * @summary 拒绝好友/入群申请

 * @route POST /api/request/reject

 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function rejectRequestHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const { type, requestID, reason, groupID } = JSON.parse(request.body);

        if (type === "group") {  // 入群申请
            await rejectGroupRequestHandler(username, requestID, groupID, reason, reply);
        } else if (type === "friend") {  // 好友申请
            await rejectFriendRequestHandler(requestID, reason, reply);
        } else {
            return reply.code(400).send(wrongType);
        }
    } catch (error) {
        console.log(`Error Rejecting Request. ${error}`);
        return reply.status(500).send({
            code: -1,
            msg: `Error Rejecting Request. ${error}`
        });
    }
}
