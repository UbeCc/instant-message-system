import { FastifyRequest, FastifyReply } from "fastify";
import { getToken } from "../../utils";
import { userModel } from "../../models/user";

// 查找特定好友
export const searchFriendHandler = async (request: FastifyRequest<{ Body: string }>, reply: FastifyReply) => {
    try {
        const decoded = await getToken(request);

        const username = JSON.parse(JSON.stringify(decoded)).username;
        const nickname = JSON.parse(request.body).nickname;
        const friends = await userModel.getUserByNickname(nickname);

        const check = await userModel.checkUsernameExists(username);
        if (!check) {
            const response = JSON.stringify({
                code: -1,
                msg: "User doesn't exist."
            });
            reply.code(400).send(response);
            return;
        }

        const response = JSON.stringify({
            code: 0,
            msg: "Friend found.",
            userList: friends.map(friend => {
                return {
                    username: friend.username,
                    nickname: friend.nickname,
                    avatar: friend.avatar
                };
            })
        });
        return reply.send(response);
    } catch (error) {
        console.log(`Error Searching For User. ${error}`, error);
        return reply.status(500).send({
            code: -1,
            msg: `Error Searching For User. ${error}`
        });
    }
};