import { FastifyRequest, FastifyReply } from "fastify";
import { friendshipModel, groupMemberModel, userModel } from "../../server";
import { convMessageModel } from "../../models/convMessage";
import { getToken } from "../../utils";
import { ObjectId } from "mongodb";

export interface Message {
    id: ObjectId;
    content: string;
    sender: string;
    createTime: Date;
    conversation: string;
}

// GET /api/message/get
/**
 * @summary 获取消息列表
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export const getMessageHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const decoded = await getToken(request);
    const username = JSON.parse(JSON.stringify(decoded)).username;
    const query = request.query as any;
    const { conversationID, after, limit } = query;
    const raw_messages = await convMessageModel.getMessageByTime(username, new ObjectId(conversationID as string), new Date(after), new Date(3000, 0, 1));

    // 先进行排序，但不在原地修改原数组
    const sortedMessages = raw_messages.slice().sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());

    // 然后从排序后的数组中切片并映射
    const messages = sortedMessages.slice(0, limit || 100).map(message => {
        return {
            conversation: conversationID,
            id: message._id,
            content: message.content,
            sender: message.sender,
            createTime: message.createTime,
        };
    });
    const has_next = messages.length === limit;
    const response = JSON.stringify({
        code: 0,
        msg: "Load messages successfully.",
        messages,
        has_next
    });
    reply.send(response);
};

// GET /api/list/conversation
/**
 * @summary 获取当前用户参与所有会话的ID
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export const getConversationIDsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const decoded = await getToken(request);
    const username = JSON.parse(JSON.stringify(decoded)).username;
    console.log("username: ", username);
    const user = await userModel.getUserByUsername(username);
    if(user === null) {
        return reply.send({
            code: -1,
            msg: "User doesn't exist."
        });
    }
    const friends = await friendshipModel.getFriendsByUsername(username);
    const friendIDs = friends.map((friend) => friend.id);
    const friendAvatars = friends.map((friend) => friend.avatar);
    const groups = await groupMemberModel.getGroupsByUsername(username);
    const groupIDs = groups.map((group) => group.groupID);
    const groupAvatars = groups.map((group) => group.avatar);
    const conversationIDs = [...friendIDs, ...groupIDs];
    const avatars = [...friendAvatars, ...groupAvatars];

    reply.send({
        code: 0,
        msg: "Get conversation ids successfully",
        conversationIDs,
        avatars,
        lastLoginTime: user.lastLoginTime,
        username
    });
};