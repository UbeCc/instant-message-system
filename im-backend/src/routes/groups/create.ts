import { FastifyRequest, FastifyReply } from "fastify";
import { ObjectId } from "mongodb";
import { groupModel, groupMemberModel } from "../../server";
import { getToken } from "../../utils";

// 建群基本信息
interface GroupData {
    groupname: string;      // 群名称
    master: string;          // 群主的 username
}

// 群成员基本信息
interface GroupMemberData {
    groupID: ObjectId;      // 群 ID
    username: string;        // 用户名称
    group_nickname: string;  // 用户群昵称
    role: number;            // 群角色：| 0：群主，1：管理员，2：普通成员
}

/**
 * @summary 拉人建群
 * @route GET /api/group/create
 * @async
 * @param {FastifyRequest<{ Body: string }>} request - Fastify 请求对象，包含用户注册信息
 * @param {FastifyReply} reply - Fastify 响应对象，用于发送响应数据
 */
export async function createGroupHandler(request: FastifyRequest<{ Body: string }>, reply: FastifyReply) {
    try {
        const decoded = await getToken(request);
        const username = JSON.parse(JSON.stringify(decoded)).username;  // 建群者默认成为群主
        const { usernameList } = JSON.parse(request.body);                   // 群成员

        // 至少选择一个除群主外的群成员
        if (usernameList === null || (usernameList !== null && usernameList.length === 0)) {
            console.log("You must choose at least one group member.");
            const response = JSON.stringify({
                code: -1,
                msg: "You must choose at least one group member."
            });
            reply.status(400).send(response);
            return;
        }

        // 建群
        const groupname = "Group of " + username;
        const groupData: GroupData = {
            groupname,
            master: username
        };
        const groupDetails = await groupModel.createGroup(groupData);

        await groupMemberModel.createGroupMember({
            groupID: groupDetails._id,
            username,
            group_nickname: username,
            role: 0
        });

        let groupMemberData: GroupMemberData;

        // 添加群成员
        for (const member of usernameList) {
            groupMemberData = {
                groupID: groupDetails._id,
                username: member,
                group_nickname: member,
                role: 2
            };
            await groupMemberModel.createGroupMember(groupMemberData);
        }

        const response = JSON.stringify({
            code: 0,
            msg: "Create group successfully.",
            groupID: groupDetails._id.toString(),
            groupname: groupDetails.groupname,
            avatar: groupDetails.avatar
        });
        return reply.send(response);
    } catch (error) {
        console.error(`Error Creating Group. ${error}`, error);
        const response = JSON.stringify({
            code: -1,
            msg: `Error Creating Group. ${error}`
        });
        return reply.status(500).send(response);
    }
}
