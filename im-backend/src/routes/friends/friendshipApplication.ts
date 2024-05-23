import { friendshipApplicationModel } from "../../server";
import { FastifyReply } from "fastify";
import { ObjectId } from "mongodb";

/**
 * @summary 发送好友申请

 * @route POST /api/request/send

 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function sendFriendRequestHandler(username: string, receiver: string, message: string, reply: FastifyReply) {
    // 创建新的好友申请
    const application = await friendshipApplicationModel.createFriendship({ sender: username, receiver, message });

    const response = JSON.stringify({
        code: 0,
        msg: "Application sent successfully.",
        requestID: application._id,
        createTime: application.createTime
    });
    return reply.send(response);
}

/**
 * @summary 通过好友申请

 * @route POST /api/request/accept

 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function acceptFriendRequestHandler(username: string, sender: string, requestId: string, reply: FastifyReply) {
    await friendshipApplicationModel.acceptApplication(username, sender, new ObjectId(requestId));
    const response = JSON.stringify({
        code: 0,
        msg: "Application accept successfully."
    });
    reply.send(response);
}

/**
 * @summary 拒绝好友申请

 * @route POST /api/request/reject

 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function rejectFriendRequestHandler(requestId: string, reason:string, reply: FastifyReply) {
    // 通过申请
    await friendshipApplicationModel.rejectApplication(new ObjectId(requestId), reason);
    const response = JSON.stringify({
        code: 0,
        msg: "Application reject successfully."
    });
    return reply.send(response);
}