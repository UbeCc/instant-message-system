import { FastifyRequest, FastifyReply } from "fastify";
import { getToken, getUserOnlineStatus } from "../../utils";
import { userModel, friendshipModel, friendshipApplicationModel, groupApplicationModel, groupMemberModel } from "../../server";

/**
 * @summary 获取用户详细信息
 * @route GET /api/user/:username
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function userProfileHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const params: any = request.params;
        const username = params.username;

        // 从数据库获取用户信息
        const user = await userModel.getDetailsByUsername(username);
        // 验证用户是否存在
        if (!user) {
            return reply.status(401).send({
                code: -1,
                msg: "User doesn't exist."
            });
        }

        const response = JSON.stringify({
            code: 0,
            msg: "Successfully fetched user info.",
            user: {
                username,
                nickname: user.nickname,
                description: user.description,
                avatar: user.avatar,
                email: user.email,
                lastLoginTime: user.lastLoginTime,
                password: user.password,
                isOnline: getUserOnlineStatus(username),
            }
        });
        reply.send(response);
    } catch (error) {
        console.log(`Error Fetching user profile. ${error}`);
        reply.status(500).send({
            code: -1,
            msg: `Error Fetching user profile. ${error}`
        });
    }
}

/**
 * @summary 获取用户好友列表
 * @route POST /api/list/friend
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function userFriendsHanler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        // 获取请求体中的用户名和密码
        // 获取 token
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;

        // 检查用户名是否已存在
        const exists = await userModel.checkUsernameExists(username);
        if (!exists) {
            return reply.status(401).send({
                code: -1,
                msg: "User doesn't exist."
            });
        }

        // 从数据库获取用户信息
        const friends = await friendshipModel.getFriendsByUsername(username);

        // 关闭数据库连接
        const response = JSON.stringify({
            code: 0,
            msg: "Successfully fetched user friends.",
            userList: friends,
        });
        return reply.send(response);
    } catch (error) {
        console.log(`Error Fetching User Friends. ${error}`);
        return reply.status(500).send({
            code: -1,
            msg: `Error Fetching User Friends. ${error}`,
            userList: []
        });
    }
}

/**
 * @summary 获取用户群组列表
 * @route POST /api/list/group
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function userGroupsHanler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;

        // 检查用户名是否已存在
        const exists = await userModel.checkUsernameExists(username);
        if (!exists) {
            return reply.status(401).send({
                code: -1,
                msg: "User doesn't exist."
            });
        }

        const groupList = await groupMemberModel.getGroupsByUsername(username);

        const response = JSON.stringify({
            code: 0,
            msg: "Successfully fetched user groups.",
            groups: groupList
        });
        return reply.send(response);
    } catch (error) {
        console.log(`Error Fetching User Groups. ${error}`);
        return reply.status(500).send({
            code: -1,
            msg: `Error Fetching User Groups. ${error}`,
            groups: []
        });
    }
}

/**
 * @summary 获取用户请求列表
 * @route POST /api/list/request
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function userRequestsHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;

        // 检查用户名是否已存在
        const exists = await userModel.checkUsernameExists(username);
        if (!exists) {
            return reply.status(401).send({
                code: -1,
                msg: "User doesn't exist."
            });
        }

        const friendRequestSent = await friendshipApplicationModel.getFriendsByUsername(username);
        const friendRequestReceived = await friendshipApplicationModel.getApplicationsByUsername(username);
        const groupRequestSent = await groupApplicationModel.getWaitingListByUsername(username);
        const groupRequestReceived = await groupApplicationModel.getApplicationByUsername(username);
        if(!friendRequestSent || !friendRequestReceived || !groupRequestSent || !groupRequestReceived) {
            return reply.status(500).send({
                code: -1,
                msg: "Error Fetching User Requests."
            });
        }

        const response = JSON.stringify({
            code: 0,
            msg: "Successfully fetched user requests.",
            requests: [...friendRequestSent, ...friendRequestReceived, ...groupRequestSent, ...groupRequestReceived]
        });
        return reply.send(response);
    } catch (error) {
        console.log(`Error Fetching User Requests. ${error}`);
        return reply.status(500).send({
            code: -1,
            msg: `Error Fetching User Requests. ${error}`,
            requests: [],
        });
    }
}
