import { initFastify } from "../../server";
import { FastifyRequest, FastifyReply } from "fastify";
import { userModel } from "../../models/user";

/**
 * @summary 注册新用户并返回 JWT
 * @description 处理 POST /api/register 请求，接收用户注册信息，验证后生成并返回 JWT Token
 * @route POST /api/register
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 * @throws {InternalServerError} - 服务器内部错误
 */
export async function registerHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    const fastify = await initFastify();
    try {
        const { username, nickname, password } = JSON.parse(request.body);
        console.log(`Register username: ${username}, nickname: ${nickname}, password: ${password}`);
        // 验证用户输入有效性
        if (!username) {
            console.log("Username is required.");
            const response = JSON.stringify({
                code: -1,
                msg: "Username is required."
            });
            reply.code(400).send(response);
            return;
        } else if (!password) {
            console.log("Password is required.");
            const response = JSON.stringify({
                code: -1,
                msg: "Password is required."
            });
            reply.code(400).send(response);
            return;
        } else if (!nickname) {
            console.log("Nickname is required.");
            const response = JSON.stringify({
                code: -1,
                msg: "Nickname is required."
            });
            reply.code(400).send(response);
            return;
        }

        // 检查用户名是否已存在
        const exists = await userModel.checkUsernameExists(username);
        if (exists) {
            console.log("User Already Exists.");
            const response = JSON.stringify({
                code: -1,
                msg: "User Already Exists."
            });
            reply.code(400).send(response);
            return;
        }
        // 创建新用户·
        const userDetails = await userModel.createUser({ username, password, nickname });

        // 签发 JWT Token
        const payload = { username: userDetails.username }; // 或者其他需要包含在JWT中的用户信息
        const token = fastify.jwt.sign(payload);

        const response = JSON.stringify({
            code: 0,
            token,
            msg: "User registered successfully."
        });
        reply.send(response);
    } catch (error) {
        reply.code(500).send({
            code: -1,
            msg: `Error registing ${error}`
        });
    }
}