import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";

import { addUser, removeUser, getUserBySocketId, getSocketIdByUsername, verifyToken } from "./utils";

import { userFriendsHanler, userProfileHandler, userGroupsHanler, userRequestsHandler } from "./routes/users/user";
import { loginHandler} from "./routes/users/login";
import { registerHandler } from "./routes/users/register";
import { userEditHandler } from "./routes/users/edit";
import { deleteUserHandler } from "./routes/users/remove";
import { searchFriendHandler } from "./routes/users/friends";
import { checkFriendshipHandler } from "./routes/friends/friendship";
import { deleteFriendHandler } from "./routes/friends/remove";
import { editFreindTagHandler } from "./routes/friends/editTag";
import { createGroupHandler } from "./routes/groups/create";
import { exitGroupHandler, deleteGroupMembersHandler } from "./routes/groups/remove";
import { editGroupHandler, getGroupDetailsHandler, searchGroupHandler } from "./routes/groups/groupInfo";
import { acceptRequestHandler, rejectRequestHandler, sendRequestHandler } from "./routes/application";
import { getConversationIDsHandler, getMessageHandler } from "./routes/chat/message";
import { getFullMsgHandler } from "./routes/chat/messageFull";
import { deleteMsgHandler } from "./routes/chat/deleteMsg";
import { getMsgRefCountHandler } from "./routes/chat/getMsgRefCount";
import { getMsgBySenderHandler } from "./routes/chat/messageBySender";
import { getMsgByTimeHandler } from "./routes/chat/messageByTime";
import { getMsgByContentHandler } from "./routes/chat/messageByContent";
import { GroupChat, PrivateChat, Recipients, Senders } from "./socket";

import { userModel } from "./models/user";
import { friendshipModel } from "./models/friendship";
import { friendshipApplicationModel } from "./models/friendshipApplication";
import { groupModel } from "./models/group";
import { groupMemberModel } from "./models/groupMember";
import { groupApplicationModel } from "./models/groupApplication";
import { convMessageModel, BriefMsg } from "./models/convMessage";

export interface Message {
  id: string;
  content: string;
  sender: string;
  createTime: Date;
  conversation: string;
  refMessage: BriefMsg;
}

const initFastify = async function () {
    userModel.init();
    friendshipModel.init();
    friendshipApplicationModel.init();
    groupApplicationModel.init();
    groupModel.init();
    groupMemberModel.init();
    convMessageModel.init();

    const fastify = Fastify({
        logger: true,
        bodyLimit: 1048576 * 10, // 10MB
        trustProxy: true
    });

    fastify.register(jwt, {
        secret: "se2024-spring"
    });

    fastify.register(cors, {
        origin: "*", // 允许任何来源
        methods: "GET, POST, PUT, DELETE", // 允许的HTTP方法
        allowedHeaders: ["Content-Type", "Authorization"], // 允许的HTTP请求头
        exposedHeaders: ["Link"], // 暴露给客户端的HTTP响应头
        maxAge: 1200, // 预检请求的缓存时间（秒）
        credentials: true // 允许携带Cookies
    });

    fastify.addHook("onClose", () => {
        console.log("Closing Fastify instance");
        userModel.close();
        friendshipModel.close();
    });

    fastify.get("/", () => {
        return { msg: "hello, world" };
    });

    fastify.post("/api/login", loginHandler);

    fastify.post("/api/register", registerHandler);

    fastify.get("/api/list/friend", userFriendsHanler);

    fastify.get("/api/list/group", userGroupsHanler);

    fastify.get("/api/list/request", userRequestsHandler);

    fastify.get("/api/list/conversation", getConversationIDsHandler);

    fastify.get("/api/user/:username", userProfileHandler);

    fastify.post("/api/user/edit", userEditHandler);

    fastify.post("/api/request/send", sendRequestHandler);

    fastify.post("/api/request/accept", acceptRequestHandler);

    fastify.post("/api/request/reject", rejectRequestHandler);

    fastify.post("/api/search/user", searchFriendHandler);

    fastify.post("/api/search/group", searchGroupHandler);

    fastify.post("/api/check/friend", checkFriendshipHandler);

    fastify.post("/api/tag", editFreindTagHandler);

    fastify.delete("/api/remove/friend", deleteFriendHandler);

    fastify.delete("/api/remove/group", exitGroupHandler);

    fastify.delete("/api/remove/group/member", deleteGroupMembersHandler);

    fastify.delete("/api/remove/user", deleteUserHandler);

    fastify.get("/api/group/:groupID", getGroupDetailsHandler);

    fastify.post("/api/group/create", createGroupHandler);

    fastify.post("/api/group/edit", editGroupHandler);

    fastify.get("/api/message/get", getMessageHandler);

    fastify.post("/api/message", getFullMsgHandler);

    fastify.post("/api/message/sender", getMsgBySenderHandler);

    fastify.post("/api/message/time", getMsgByTimeHandler);

    fastify.post("/api/message/content", getMsgByContentHandler);

    fastify.post("/api/message/refer", getMsgRefCountHandler);

    fastify.delete("/api/message/delete", deleteMsgHandler);

    return fastify;
};


(async () => {
    const fastify = await initFastify();
    const httpServer: HttpServer = fastify.server;
    const io = new SocketIOServer(httpServer);

    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      const verifyResult = await verifyToken(token);
      if (verifyResult) next();
      else next(new Error("Invalid token"));
    });

    io.on("connection", (socket) => {
        socket.on("set username", async (username) => {
          addUser(username, socket.id);
          console.log(`Set ${socket.id}" username to ${username}`);
        });

        socket.on("join private_chat", (conversation) => {
          socket.join(conversation);
          console.log(`User ${getUserBySocketId(socket.id)} joined conversation ${conversation}`);
        });

        socket.on("join group_chat", (group) => {
          socket.join(group);
          console.log(`User ${getUserBySocketId(socket.id)} joined group ${group}`);
        });

        socket.on("update_read_cursor", async (convID, time) => {
          const username = getUserBySocketId(socket.id);
          const receiver = await friendshipModel.getFriendUsername(username, convID);
          const result = await friendshipModel.checkFriendshipExists(username, receiver);
          const friendshipId: string = result?.friendshipID;
          console.log(friendshipId);
          if (friendshipId) {
            console.log("UPDATE FRIEND READ CURSUR");
            await friendshipModel.updateConvCursor(username, time, convID);
          } else {
            console.log("UPDATE GROUP READ CURSUR");
            await groupMemberModel.updateConvCursor(username, time, convID);
          }
        });

        socket.on("update_my_cursor", async (time: Date) => {
          const username = getUserBySocketId(socket.id);
          console.log("Cur Socket Id: ", socket.id);
          console.log(`User ${getUserBySocketId(socket.id)} updated cursor to ${time}`);
          const rawFriendConvs = await friendshipModel.getFriendsByUsername(username);
          const rawGroupConvs = await groupMemberModel.getGroupsByUsername(username);
          rawFriendConvs.map((friend) => {
            const friendUsername = friend.username;
            io.to(friendUsername).emit("update_member_cursor", username, friend.id, time);
          });
          rawGroupConvs.map((group) => {
            const groupID = group.groupID.toString();
            io.to(groupID).emit("update_member_cursor", username, groupID, time);
          });
        });

        socket.on("private_chat", async (message: Message, ref: boolean) => {
          const sender = message.sender;
          const senders = getSocketIdByUsername(sender);
          const receiver = await friendshipModel.getFriendUsername(sender, message.conversation);
          const recipients = getSocketIdByUsername(receiver);
          const _id: string = message.id;
          await PrivateChat(message, ref);
          io.to(socket.id).emit("send_msg_successfully", message.id);
          await Recipients(recipients, io, _id, sender, message);
          await Senders(socket, senders, io, _id, sender, message);
        });

        socket.on("group_chat", async (message: Message, ref: boolean) => {
          await GroupChat(message, ref);
          io.to(socket.id).emit("send_msg_successfully", message.id);
          socket.broadcast.emit("group_chat", message);
        });

        socket.on("disconnect", async () => {
          const username = getUserBySocketId(socket.id);
          removeUser(username, socket.id);
          await userModel.logout(username);
          console.log(`${username} has disconnected.`);
        });
    });

    if(process.env.NODE_ENV !== "test") {
        fastify.listen({ port: 80, host: "0.0.0.0" }, (err, address) => {
            if (err) {
                fastify.log.error(err);
                process.exit(1);
            } else {
                console.log(`Server listening at ${address}`);
            }
        });
    }
})();

export { userModel, friendshipModel, friendshipApplicationModel, groupApplicationModel, groupModel, groupMemberModel, convMessageModel,  initFastify };