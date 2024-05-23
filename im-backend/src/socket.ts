import { Message, groupMemberModel } from "./server";
import { friendshipModel } from "./models/friendship";
import { convMessageModel } from "./models/convMessage";
import { ObjectId } from "mongodb";
import { Socket, Server as SocketIOServer } from "socket.io";

export async function PrivateChat(message: Message, ref: boolean) {
    const sender = message.sender;
    const receiver = await friendshipModel.getFriendUsername(sender, message.conversation);
    const result = await friendshipModel.checkFriendshipExists(sender, receiver);
    const friendshipId: string = result?.friendshipID;
    const _id: string = message.id;
    if (friendshipId !== undefined) {
        await friendshipModel.updateConvCursor(sender, new Date(), message.id);
        // 若 ref 为 True ，需传入所引用消息的相关信息
        if (ref) {
            try {
            if (message.refMessage.msgID && message.refMessage.content && message.refMessage.sender) {
                await convMessageModel.createMessage({
                conv_id: new ObjectId(friendshipId),
                message: {
                    _id,
                    content: message.content,
                    sender: message.sender,
                    createTime: message.createTime,
                    refCount: 0,
                    refMessage: message.refMessage
                }
                });
                await convMessageModel.refMessage(new ObjectId(friendshipId), message.refMessage.msgID);
            } else {
                throw new Error("All of msgID, content and sender of message.refMessage are needed.");
            }
            } catch (error) {
            console.log(`Error Private Chat When Referring To A Message. ${error}`, error);
            }
        } else {
            await convMessageModel.createMessage({
            conv_id: new ObjectId(friendshipId),
            message: {
                _id,
                content: message.content,
                sender,
                createTime: message.createTime,
                refCount: 0,
                refMessage:  null
            }
            });
        }
    }
}

export async function Recipients(recipients: string[], io: SocketIOServer, _id: string, sender: string, message: Message) {
    if(recipients) {
        for (const recipient of recipients) {
            if (recipient !== undefined) {
                io.to(recipient).emit("private_chat", {
                _id,
                sender,
                content: message.content,
                createTime: message.createTime,
                conversation: message.conversation,
                });
            }
        }
    }
}

export async function Senders(socket: Socket, senders: string[], io: SocketIOServer, _id: string, sender: string, message: Message) {
    if(senders) {
        for (const senderId of senders) {
            if (senderId !== undefined && senderId !== socket.id) {
                io.to(senderId).emit("private_chat", {
                _id,
                sender,
                content: message.content,
                createTime: message.createTime,
                conversation: message.conversation,
                });
            }
        }
    }
}

export async function GroupChat(message: Message, ref: boolean) {
    const group: string = message.conversation;
    const _id = message.id;
    if (group !== undefined) {
        await groupMemberModel.updateConvCursor(message.sender, new Date(), message.id);
        // 若 ref 为 True ，需传入所引用消息的相关信息
        if (ref) {
            try {
            if (message.refMessage.msgID && message.refMessage.sender) {
            await convMessageModel.createMessage({
                conv_id: new ObjectId(group),
                message: {
                _id: message.id,
                content: message.content,
                sender: message.sender,
                createTime: message.createTime,
                refCount: 0,
                refMessage: message.refMessage
                }
            });
            await convMessageModel.refMessage(new ObjectId(group), message.refMessage.msgID);
            } else {
                throw new Error("All of msgID, content and sender of message.refMessage are needed.");
            }
            } catch (error) {
            console.log(`Error Group Chat When Referring To A Message. ${error}`, error);
            }
        } else {
            await convMessageModel.createMessage({
            conv_id: new ObjectId(group),
                message: {
                    _id,
                    content: message.content,
                    sender: message.sender,
                    createTime: message.createTime,
                    refCount: 0,
                    refMessage:  null
                }
            });
        }
    }
}