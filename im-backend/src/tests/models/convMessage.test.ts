import { ObjectId } from "mongodb";
import { ConvMessageData, Message } from "../../models/convMessage";
import { convMessageModel, friendshipModel, groupMemberModel } from "../../server";
import { connectToDatabase } from "../../models/database";

describe("ConvMessageModel", () => {
    const testUsername1 = "test-user1";
    const testUsername2 = "test-user2";
    const testGroupNickname = "test-group-nickname";
    const testRole = 2;
    let testFriendshipID: ObjectId;
    const testGroupID = new ObjectId();
    const testMsgID1 = new ObjectId().toString();
    const testMsgID2 = new ObjectId().toString();
    const wrongID = new ObjectId();
    const testMessageContent = "test-content";
    const testMessage: Message = {
        content: testMessageContent,
        sender: testUsername1,
        createTime: new Date(),
        _id: testMsgID1,
        refCount: 0,
        refMessage: null
    };
    const testMessage2: Message = {
        content: testMessageContent,
        sender: testUsername1,
        createTime: new Date(),
        _id: testMsgID2,
        refCount: 0,
        refMessage: null
    };

    beforeAll(async () => {
        const db = await connectToDatabase();
        await db.collection("convMessage").deleteMany({});
        await db.collection("friendship").deleteMany({});
        await db.collection("groupMember").deleteMany({});
        await convMessageModel.init();
        await friendshipModel.init();
        await groupMemberModel.init();

        const friendship = await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });
        testFriendshipID = friendship._id;
        await groupMemberModel.createGroupMember({ groupID: testGroupID, username: testUsername1, group_nickname: testGroupNickname, role: testRole});
    });

    afterAll(async () => {
        await convMessageModel.close();
    });

    describe("createConvMessage()", () => {
        it("should create a new conversation message list in the database", async () => {
            const isCreated = await convMessageModel.createConvMessage(testFriendshipID);
            expect(isCreated).toBe(true);

            const db = await connectToDatabase();
            const fetchedConvMessage = await db.collection("convMessage").findOne({ conv_id: testFriendshipID });
            expect(fetchedConvMessage).toBeTruthy();
            if (fetchedConvMessage !== null) {
                expect(fetchedConvMessage.msg_list).toEqual([]);
            }
        });
    });

    describe("createMessage()", () => {
        beforeEach(async () => {
            const db = await connectToDatabase();
            await db.collection("convMessage").deleteMany({});
            await convMessageModel.createConvMessage(testFriendshipID);
        });

        it("should create a new message within the specified conversation", async () => {
            const messageData: ConvMessageData = {
                conv_id: testFriendshipID,
                message: testMessage
            };

            const isCreated = await convMessageModel.createMessage(messageData);
            expect(isCreated).toBe(true);

            const db = await connectToDatabase();
            const fetchedConvMessage = await db.collection("convMessage").findOne({ conv_id: testFriendshipID });
            expect(fetchedConvMessage).toBeTruthy();
            if (fetchedConvMessage !== null) {
                expect(fetchedConvMessage.msg_list).toContainEqual(testMessage);
            }
        });

        it("should handle error and return false", async () => {
            const messageData: ConvMessageData = {
                conv_id: new ObjectId(),
                message: testMessage
            };

            const isCreated = await convMessageModel.createMessage(messageData);
            expect(isCreated).toBe(false);
        });
    });

    describe("deleteMessage()", () => {
        beforeEach(async () => {
            const db = await connectToDatabase();
            await db.collection("convMessage").deleteMany({});
            await db.collection("friendship").updateOne({ _id: testFriendshipID }, { $set: { senderDeleteList: [], receiverDeleteList: [] } });
            await db.collection("groupMember").updateOne({ groupID: testGroupID }, { $set: { deleteList: [] } });

            await convMessageModel.createConvMessage(testFriendshipID);
            await convMessageModel.createConvMessage(testGroupID);
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMessage });
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMessage2 });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMessage });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMessage2 });
        });

        // a. 作为 sender 删除私聊消息
        it("should delete a message as sender", async () => {
            await convMessageModel.deleteMessage(testUsername1, testMsgID2, testFriendshipID);

            const db = await connectToDatabase();
            const deleteList = await db.collection("friendship").findOne<{ senderDeleteList: ObjectId[] }>({ _id: testFriendshipID });
            expect(deleteList?.senderDeleteList).toEqual([testMsgID2.toString()]);
        });

        // b. 作为 receiver 删除私聊消息
        it("should delete a message as receiver", async () => {
            await convMessageModel.deleteMessage(testUsername2, testMsgID2, testFriendshipID);

            const db = await connectToDatabase();
            const deleteList = await db.collection("friendship").findOne<{ receiverDeleteList: ObjectId[] }>({ _id: testFriendshipID });
            expect(deleteList?.receiverDeleteList).toEqual([testMsgID2.toString()]);
        });

        // c. 作为 groupMember 删除群聊消息
        it("should delete a message as groupMember", async () => {
            await convMessageModel.deleteMessage(testUsername1, testMsgID2, testGroupID);

            const db = await connectToDatabase();
            console.log(await db.collection("groupMember").findOne({ groupID: testGroupID, username: testUsername1 }));
            const deleteList = await db.collection("groupMember").findOne<{ deleteList: ObjectId[] }>({ groupID: testGroupID, username: testUsername1 });
            expect(deleteList?.deleteList).toEqual([testMsgID2.toString()]);
        });

        // d. 找不到会话，抛出异常
        it("should throw error when there is not such conversation", async () => {
            await expect(convMessageModel.deleteMessage(testUsername1, testMsgID2, wrongID)).rejects.toThrow("Error Deleteing Message In Model. Error: Delete list not found.");
        });
    });

    describe("getMessage()", () => {
        beforeAll(async () => {
            const db = await connectToDatabase();
            await db.collection("convMessage").deleteMany({});
            await convMessageModel.createConvMessage(testFriendshipID);
            await convMessageModel.createConvMessage(testGroupID);
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMessage });
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMessage2 });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMessage });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMessage2 });
            await convMessageModel.deleteMessage(testUsername1, testMsgID2, testFriendshipID);
            await convMessageModel.deleteMessage(testUsername2, testMsgID2, testFriendshipID);
            await convMessageModel.deleteMessage(testUsername1, testMsgID2, testGroupID);
        });

        describe("getFullMessage()", () => {
            // a. 作为 sender 获取私聊消息
            it("should retrieve all messages for a given conversation from private conversation as sender", async () => {
                const messages = await convMessageModel.getFullMessage(testUsername1, testFriendshipID);
                expect(messages).toHaveLength(1);
                if (Array.isArray(messages) && messages.length > 0){
                    expect(messages[0]).toEqual(testMessage);
                }
            });

            // b. 作为 receiver 获取私聊消息
            it("should retrieve all messages for a given conversation from private conversation as receiver", async () => {
                const messages = await convMessageModel.getFullMessage(testUsername2, testFriendshipID);
                expect(messages).toHaveLength(1);
                if (Array.isArray(messages) && messages.length > 0){
                    expect(messages[0]).toEqual(testMessage);
                }
            });

            // c. 作为 groupMember 获取群聊消息
            it("should retrieve all messages for a given conversation from group conversation as a groupMember", async () => {
                const messages = await convMessageModel.getFullMessage(testUsername1, testGroupID);
                expect(messages).toHaveLength(1);
                if (Array.isArray(messages) && messages.length > 0){
                    expect(messages[0]).toEqual(testMessage);
                }
            });

            // d. 会话不存在，抛出异常
            it("should throw error when there is not such conversation", async () => {
                await expect(convMessageModel.getFullMessage(testUsername1, wrongID)).rejects.toThrow("Error Getting Full Message List In Model. Error: The conversation doesn't exist.");
            });
        });

        describe("getMessageByTime()", () => {
            // a. 作为 sender 获取私聊消息
            it("should filter messages by time range which is ok as sender", async () => {
                const startTime = testMessage.createTime;
                const finishTime = new Date(testMessage.createTime.getTime() + 1000); // Set finishTime to be slightly after startTime
                const messagesInRange = await convMessageModel.getMessageByTime(testUsername1, testFriendshipID, startTime,finishTime);

                expect(messagesInRange).toHaveLength(1);
                if (Array.isArray(messagesInRange) && messagesInRange.length > 0){
                    expect(messagesInRange[0]).toEqual(testMessage);
                }
            });

            // b. 作为 receiver 获取私聊消息
            it("should filter messages by time range which is ok as receiver", async () => {
                const startTime = testMessage.createTime;
                const finishTime = new Date(testMessage.createTime.getTime() + 1000); // Set finishTime to be slightly after startTime
                const messagesInRange = await convMessageModel.getMessageByTime(testUsername2, testFriendshipID, startTime,finishTime);

                expect(messagesInRange).toHaveLength(1);
                if (Array.isArray(messagesInRange) && messagesInRange.length > 0){
                    expect(messagesInRange[0]).toEqual(testMessage);
                }
            });

            // c. 作为 groupMember 获取群聊消息
            it("should filter messages by time range which is ok as a groupMember", async () => {
                const startTime = testMessage.createTime;
                const finishTime = new Date(testMessage.createTime.getTime() + 1000); // Set finishTime to be slightly after startTime
                const messagesInRange = await convMessageModel.getMessageByTime(testUsername1, testGroupID, startTime,finishTime);

                expect(messagesInRange).toHaveLength(1);
                if (Array.isArray(messagesInRange) && messagesInRange.length > 0){
                    expect(messagesInRange[0]).toEqual(testMessage);
                }
            });

            // d. 该时段内没有消息，则返回空列表
            it("should filter messages by time range which isn't ok", async () => {
                const startTime = new Date(testMessage.createTime.getTime() + 500);
                const finishTime = new Date(testMessage.createTime.getTime() + 1000);
                const messagesInRange = await convMessageModel.getMessageByTime(testUsername1, testFriendshipID, startTime,finishTime);

                expect(messagesInRange).toHaveLength(0);
            });

            // e. 会话不存在，抛出异常
            it("should return false when there is not such conversation", async () => {
                const startTime = new Date(testMessage.createTime.getTime() + 500);
                const finishTime = new Date(testMessage.createTime.getTime() + 1000);
                await expect(convMessageModel.getMessageByTime(testUsername1, wrongID, startTime,finishTime)).rejects.toThrow("Error Getting Message List By Time In Model. Error: The conversation doesn't exist.");
            });
        });

        describe("getMessageBySender()", () => {
            // a. 作为 sender 获取私聊消息
            it("should filter messages by sender", async () => {
                const messagesBySender = await convMessageModel.getMessageBySender(testUsername1, testFriendshipID, testUsername1);

                expect(messagesBySender).toHaveLength(1);
                if (Array.isArray(messagesBySender) && messagesBySender.length > 0) {
                    expect(messagesBySender[0]).toEqual(testMessage);
                }
            });

            // b. 作为 receiver 获取私聊消息
            it("should filter messages by sender", async () => {
                const messagesBySender = await convMessageModel.getMessageBySender(testUsername2, testFriendshipID, testUsername1);

                expect(messagesBySender).toHaveLength(1);
                if (Array.isArray(messagesBySender) && messagesBySender.length > 0) {
                    expect(messagesBySender[0]).toEqual(testMessage);
                }
            });

            // c. 作为 groupMember 获取群聊消息
            it("should filter messages by sender", async () => {
                const messagesBySender = await convMessageModel.getMessageBySender(testUsername1, testGroupID, testUsername1);

                expect(messagesBySender).toHaveLength(1);
                if (Array.isArray(messagesBySender) && messagesBySender.length > 0) {
                    expect(messagesBySender[0]).toEqual(testMessage);
                }
            });

            // d. 会话不存在，抛出异常
            it("should return false when there is not such conversation", async () => {
                await expect(convMessageModel.getMessageBySender(testUsername1, wrongID, testUsername1)).rejects.toThrow("Error Getting Message List By Sender In Model. Error: The conversation doesn't exist.");
            });
        });

        describe("getMessageByContent()", () => {
            // a. 作为 sender 获取私聊消息
            it("should filter messages by content", async () => {
                const messagesBySender = await convMessageModel.getMessageByContent(testUsername1, testFriendshipID, testMessageContent);

                expect(messagesBySender).toHaveLength(1);
                if (Array.isArray(messagesBySender) && messagesBySender.length > 0) {
                    expect(messagesBySender[0]).toEqual(testMessage);
                }
            });

            // b. 作为 receiver 获取私聊消息
            it("should filter messages by content", async () => {
                const messagesBySender = await convMessageModel.getMessageByContent(testUsername2, testFriendshipID, testMessageContent);

                expect(messagesBySender).toHaveLength(1);
                if (Array.isArray(messagesBySender) && messagesBySender.length > 0) {
                    expect(messagesBySender[0]).toEqual(testMessage);
                }
            });

            // c. 作为 groupMember 获取群聊消息
            it("should filter messages by content", async () => {
                const messagesBySender = await convMessageModel.getMessageByContent(testUsername1, testGroupID, testMessageContent);

                expect(messagesBySender).toHaveLength(1);
                if (Array.isArray(messagesBySender) && messagesBySender.length > 0) {
                    expect(messagesBySender[0]).toEqual(testMessage);
                }
            });

            // d. 会话不存在，抛出异常
            it("should return false when there is not such conversation", async () => {
                await expect(convMessageModel.getMessageByContent(testUsername1, wrongID, testMessageContent)).rejects.toThrow("Error Getting Message List By Content In Model. Error: The conversation doesn't exist.");
            });
        });
    });

    describe("refMessage()", () => {
        beforeEach(async () => {
            const db = await connectToDatabase();
            await db.collection("convMessage").deleteMany({});
            await db.collection("friendship").updateOne({ _id: testFriendshipID }, { $set: { senderDeleteList: [], receiverDeleteList: [] } });
            await db.collection("groupMember").updateOne({ groupID: testGroupID }, { $set: { deleteList: [] } });

            await convMessageModel.createConvMessage(testFriendshipID);
            await convMessageModel.createConvMessage(testGroupID);
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMessage });
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMessage2 });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMessage });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMessage2 });
        });

        // a. 引用消息
        it("should increase refCount of corresponding messages", async () => {
            await convMessageModel.refMessage(testFriendshipID, testMsgID1);

            const db = await connectToDatabase();
            const result = await db.collection("convMessage").findOne<{ msg_list: Message[] }>({ conv_id: testFriendshipID });
            expect(result?.msg_list).toEqual(
                [{
                        _id: expect.any(String),
                        content: testMessageContent,
                        createTime: expect.any(Date),
                        refCount: 1,
                        refMessage: null,
                        sender: testUsername1,
                    },
                    {
                        _id: expect.any(String),
                        content: testMessageContent,
                        createTime: expect.any(Date),
                        refCount: 0,
                        refMessage: null,
                        sender: testUsername1,
                    }]
            );
        });
    });

    describe("getRefMessage()", () => {
        beforeEach(async () => {
            const db = await connectToDatabase();
            await db.collection("convMessage").deleteMany({});
            await db.collection("friendship").updateOne({ _id: testFriendshipID }, { $set: { senderDeleteList: [], receiverDeleteList: [] } });
            await db.collection("groupMember").updateOne({ groupID: testGroupID }, { $set: { deleteList: [] } });

            await convMessageModel.createConvMessage(testFriendshipID);
            await convMessageModel.createConvMessage(testGroupID);
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMessage });
            await convMessageModel.createMessage({ conv_id: testFriendshipID, message: testMessage2 });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMessage });
            await convMessageModel.createMessage({ conv_id: testGroupID, message: testMessage2 });
        });

        // a. 成功获取引用消息
        it("should get reference message successfully", async () => {
            const result = await convMessageModel.getRefMessage(testFriendshipID, testMsgID1);

            expect(result).toEqual(
                {
                    refCount: 0,
                    refMessage: null
                },
            );
        });

        // b. 获取失败，抛出异常
        it("should throw error when there is not such conversation", async () => {
            await expect(convMessageModel.getRefMessage(testFriendshipID, new ObjectId().toString())).rejects.toThrow("Error Getting Message Reference Count In Model. Error: The message doesn't exist.");
        });
    });
});