import bcrypt from "bcrypt";
import { FastifyRequest } from "fastify";
import { initFastify } from "./server";

/**
 * 
 * @param token 
 * @returns
 */
export async function verifyToken(token: string) {
    try {
        // 这里使用你的刷新令牌解码和验证逻辑
        const fastify = await initFastify();
        const decoded = fastify.jwt.verify(token);
        // 验证用户是否有效及令牌未被撤销等操作...
        return decoded;
    } catch (error) {
        throw new Error("Invalid refresh token");
    }
}

export async function getSignedToken(username: string) {
    const fastify = await initFastify();
    const token = fastify.jwt.sign({ username }, { expiresIn: "7d" });
    return token;
}
export async function getToken(request: FastifyRequest) {
    const token = request.headers.authorization;
    const decoded = await verifyToken(token as string) as string;
    return decoded;
}

interface User2IdDict {
    [Key: string]: string[];
}

interface Id2UserDict {
    [Key: string]: string;
}

const User2Id: User2IdDict = {};
const Id2User: Id2UserDict = {};

async function addUser(username: string, socketId: string) {
    if (User2Id[username] === undefined) {
        User2Id[username] = [];
    }
    User2Id[username].push(socketId);
    Id2User[socketId] = username;
}

const getUserOnlineStatus = (username: string) => {
    return User2Id[username] !== undefined;
};

async function removeUser(username: string, socketId: string) {
    delete Id2User[socketId];
    const socketIds = User2Id[username];
    if(socketIds) {
        const index = socketIds.indexOf(socketId);
        if (index > -1) {
            socketIds.splice(index, 1);
        }
        if(socketIds.length === 0) {
            delete User2Id[username];
        }
    }
    console.log(socketIds, "QWQ");
}

const getSocketIdByUsername = (username: string) => {
    return User2Id[username];
};

const getUserBySocketId = (socketId: string) => {
    return Id2User[socketId];
};

/**
   * @summary 生成带盐值的哈希处理过的密码
   * @param {string} password - 用户注册密码
*/
export async function hashPassword(password: string) {
    const saltRounds = 10; // 设置盐值迭代次数，可根据需求调整
    // 使用 bcrypt 进行加密
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

export { addUser, removeUser, getSocketIdByUsername, getUserBySocketId, getUserOnlineStatus };