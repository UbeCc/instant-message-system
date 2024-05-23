import { groupApplicationModel } from "../../server";
import { FastifyReply } from "fastify";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../models/database";
/**
 * @summary 发送入群申请
 * @route POST /api/request/send
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */

export async function sendGroupRequestHandler(sender: string, groupId: string, message: string, reply: FastifyReply) {
    // 创建新的入群申请
    const application = await groupApplicationModel.createGroupApplication({ groupID: new ObjectId(groupId), username: sender, message });

    const response = JSON.stringify({
        code: 0,
        msg: "Application sent successfully.",
        requestID: application._id,
        createTime: application.join_time
    });
    return reply.send(response);
}

/**
 * @summary 通过入群申请

 * @route POST /api/request/accept

 * @async
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function acceptGroupRequestHandler(username: string, sender: string, requestId: string, groupId: string, reply: FastifyReply) {
    const db = await connectToDatabase();
    const groupMemberCollection = db.collection("groupMember");
    const examiner = await groupMemberCollection.findOne({ username, groupID: new ObjectId(groupId) });
    if (!examiner) {
        const response = JSON.stringify({
            code: -1,
            msg: "The examiner doesn't belong to the group."
        });
        reply.code(400).send(response);
        return;
    } else {
        const role = examiner.role;
        if (role !== 0 && role !== 1) {
            const response = JSON.stringify({
                code: -1,
                msg: "The examiner must be a master or an admin."
            });
            reply.code(400).send(response);
            return;
        }
    }

    // 通过申请
    await groupApplicationModel.acceptApplication(new ObjectId(groupId), sender, new ObjectId(requestId));
    const response = JSON.stringify({
        code: 0,
        msg: "Application accept successfully."
    });
    return reply.send(response);
}


/**
 * @summary 拒绝入群申请
 * @route POST /api/request/reject
 * @async
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function rejectGroupRequestHandler(username:string, requestId: string, groupId: string, reason: string, reply: FastifyReply) {
    const db = await connectToDatabase();
    const groupMemberCollection = db.collection("groupMember");
    const examiner = await groupMemberCollection.findOne({ username, groupID: new ObjectId(groupId) });
    if (!examiner) {
        const response = JSON.stringify({
            code: -1,
            msg: "The examiner doesn't belong to the group."
        });
        reply.code(400).send(response);
        return;
    } else {
        const role = examiner.role;
        if (role !== 0 && role !== 1) {
            const response = JSON.stringify({
                code: -1,
                msg: "The examiner must be a master or an admin."
            });
            reply.code(400).send(response);
            return;
        }
    }

    // 拒绝申请
    await groupApplicationModel.rejectApplication(new ObjectId(requestId), reason);
    const response = JSON.stringify({
        code: 0,
        msg: "Application reject successfully."
    });
    return reply.send(response);
}