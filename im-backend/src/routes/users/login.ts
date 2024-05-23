import { FastifyRequest, FastifyReply } from "fastify";
import { getSignedToken } from "../../utils";
import { userModel } from "../../models/user";
import { connectToDatabase } from "../../models/database";

/**
 * @summary 登录账号
 * @description 处理 POST /api/login 请求，登录账号
 * @route POST /api/login
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function loginHandler(request: FastifyRequest<{ Body: string }>,reply: FastifyReply) {
    try {
        // 获取 token
        const { username, password } = JSON.parse(request.body);

        // 从数据库获取用户信息
        const user = await userModel.getUserByUsername(username);

        if(user?.isGhost) {
            console.log("GHOST");
            return reply.status(401).send({
                code: -2,
                msg: "User is a ghost."
            });
        }

        // 验证用户是否存在
        if (user === null) {
            console.log("NOEXIST");
            return reply.status(401).send({
                code: -1,
                msg: "User Doesn't Exist."
            });
        }

        // 验证密码是否正确
        if (await userModel.comparePasswords(password, user.password) === false) {
            console.log("WRONG PW");
            return reply.status(401).send({
                code: -1,
                msg: "Password wrong."
            });
        }
        // 更新最新登陆时间
        const db = await connectToDatabase();
        const usersCollection = db.collection("user");

        await usersCollection.updateOne({username}, {$set: {lastLoginTime: new Date()}});
        // 生成并返回令牌
        const token = await getSignedToken(username);

        const response = JSON.stringify({
            code: 0,
            msg: "Login successfully.",
            token,
            user: {
                username,
                nickname: user.nickname,
                avatar: user.avatar
            }
        });
        return reply.send(response);
    } catch (error) {
        return reply.code(500).send({
            code: -1,
            msg: "Error Logining."
        });
    }
}