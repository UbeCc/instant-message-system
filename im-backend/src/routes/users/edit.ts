import { FastifyRequest, FastifyReply } from "fastify";
import { getToken } from "../../utils";
import { userModel } from "../../server";

/**
 * @summary 修改用户信息
 * @route POST /api/user/edit
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function userEditHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;
        const body = JSON.parse(request.body);
        // 若传入了 password 则是 reset
        if(body.oldPassword) {
            const user = await userModel.getUserByUsername(username);
            // 验证用户是否存在
            if (!user) {
                const response = JSON.stringify({
                    code: -1,
                    msg: "User doesn't exist.",
                });
                reply.code(400).send(response);
                return;
            }
            if (await userModel.comparePasswords(body.oldPassword, user.password) === false) {
                return reply.status(401).send({
                    code: -1,
                    msg: "Password wrong."
                });
            }
            // 重置密码
            if (body.newPassword) {
                await userModel.resetPassword(username, body.newPassword);

                const response = JSON.stringify({
                    code: 0,
                    msg: "Password Reset Successfully."
                });
                return reply.send(response);
            } else if (body.email) {  // 修改邮箱
                await userModel.editEmail(username, body.email);

                const response = JSON.stringify({
                    code: 0,
                    msg: "Email Edit Successfully."
                });
                return reply.send(response);
            }
        } else {
            const { nickname, description, avatar } = JSON.parse(request.body);

            // 修改用户信息
            const editedUser = await userModel.editUser(username, nickname, description, avatar);
            if (editedUser) {  // 修改成功则返回详细信息
                const response = JSON.stringify({
                    code: 0,
                    msg: "User Info Edited Successfully.",
                    user: {
                        nickname,
                        avatar,
                        description,
                        lastLoginTime: editedUser.lastLoginTime
                    }
                });
                reply.send(response);
            } else {          // 否则反馈修改失败
                const response = JSON.stringify({
                    code: -1,
                    msg: "User doesn't exist.",
                });
                return reply.code(400).send(response);
            }
        }
    } catch (error) {
        console.log(`Error Editing User. ${error}`);
        return reply.status(500).send({
            code: -1,
            msg: `Error Editing User. ${error}`
        });
    }
}

