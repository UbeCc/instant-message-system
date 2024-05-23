import { FriendshipData } from "../../models/friendship";
import { userModel, friendshipModel } from "../../server";
import { connectToDatabase } from "../../models/database";
import { ObjectId } from "@fastify/mongodb";

describe("FriendshipModel", () => {
    const testUsername1 = "test-username1";
    const testUsername2 = "test-username2";
    const testTag = "test-tag";
    beforeAll(async () => {
        await friendshipModel.init();
        await userModel.init();
    });
    beforeEach(async () => {
        // 清空或重置测试集合
        const db = await connectToDatabase();
        await db.collection("friendship").deleteMany({});
        await db.collection("user").deleteMany({});
    });
    afterAll(async () => {
        await friendshipModel.close();
    });

    describe("createFriendship", () => {
        it("should create a friendship and return the created document", async () => {
            const testData: FriendshipData = {
                sender: testUsername1,
                receiver: testUsername2,
            };

            const createdFriendship = await friendshipModel.createFriendship(testData);

            expect(createdFriendship.sender).toBe(testData.sender);
            expect(createdFriendship.receiver).toBe(testData.receiver);
            expect(createdFriendship.createTime).toBeInstanceOf(Date);
            expect(createdFriendship.senderTag).toBe("");
            expect(createdFriendship.receiverTag).toBe("");
        });

        it("should throw error when create a friendship twice", async () => {
            const testData: FriendshipData = {
                sender: testUsername1,
                receiver: testUsername2,
            };

            await friendshipModel.createFriendship(testData);
            await expect(friendshipModel.createFriendship(testData)).rejects.toThrow("Friendship already exists.");

        });
    });

    describe("getFriendsByUsername()", () => {
        it("should get friends by username", async () => {
            await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });
            await friendshipModel.createFriendship({ sender: "user3", receiver: testUsername1 });
            await userModel.createUser({ username: testUsername2, password: "password", nickname: "nickname"});
            await userModel.createUser({ username: "user3", password: "password", nickname: "nickname"});
            const friends = await friendshipModel.getFriendsByUsername(testUsername1);
            expect(friends).toHaveLength(2);
            if (friends !== null && friends.length > 1) {
                expect(friends[0].username).toBe(testUsername2);
                expect(friends[1].username).toBe("user3");
            }
        });
    });

    describe("checkFriendshipExists()", () => {
        it("should check if the friendship exists by sender-receiver", async () => {
            await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });
            const exists = await friendshipModel.checkFriendshipExists(testUsername1, testUsername2);
            expect(exists).toEqual({
                tag: "",
                friendshipID: expect.any(String)
            });
        });

        it("should check if the friendship exists by receiver-sender", async () => {
            await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });
            const exists = await friendshipModel.checkFriendshipExists(testUsername2, testUsername1);
            expect(exists).toEqual({
                tag: "",
                friendshipID: expect.any(String)
            });
        });

        it("should return empty result if the friendship doesn't exist", async () => {
            const nonExistent = await friendshipModel.checkFriendshipExists(testUsername1, "nonexistent");
            expect(nonExistent).toEqual({
                tag: null,
                friendshipID: ""
            });
        });
    });

    describe("editTag()", () => {
        it("should update tag when user is sender and succeed", async () => {
            await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });
            await friendshipModel.editTag(testUsername1, testUsername2, testTag);

            const db = await connectToDatabase();
            const friendship = await db.collection("friendship").findOne<{ receiverTag: string }>({ sender: testUsername1, receiver: testUsername2 });
            expect(friendship?.receiverTag).toBe(testTag);
        });

        it("should update tag when user is receiver and succeed", async () => {
            await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });
            await friendshipModel.editTag(testUsername2, testUsername1, testTag);

            const db = await connectToDatabase();
            const friendship = await db.collection("friendship").findOne<{ senderTag: string }>({ sender: testUsername1, receiver: testUsername2 });
            expect(friendship?.senderTag).toBe(testTag);
        });

        it("should throw error when friendship doesn't exist", async () => {
            await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });
            await expect(friendshipModel.editTag(testUsername1, "passer-by", testTag)).rejects.toThrow("Error Editing Friend Tag:. Error: They are not Friends!");
        });
    });

    describe("deleteFriendship()", () => {
        it("should delete a friendship by sender", async () => {
            await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });
            await friendshipModel.deleteFriendship(testUsername1, testUsername2);

            const db = await connectToDatabase();
            const remainingFriendships = await db.collection("friendship").find().toArray();
            expect(remainingFriendships.length).toBe(0);
        });

        it("should delete a friendship by receiver", async () => {
            await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });
            await friendshipModel.deleteFriendship(testUsername2, testUsername1);

            const db = await connectToDatabase();
            const remainingFriendships = await db.collection("friendship").find().toArray();
            expect(remainingFriendships.length).toBe(0);
        });

        it("should return \"Friendship does not exist.\" when friendship doesn't exist.", async () => {
            const result = await friendshipModel.deleteFriendship(testUsername2, testUsername1);
            expect(result).toBeFalsy();
        });
    });

    describe("getFriendUsername()", () => {
        it("should get friend username as sender", async () => {
            const friendship = await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });

            const result = await friendshipModel.getFriendUsername(testUsername1, friendship._id.toString());
            expect(result).toBe(testUsername2);
        });

        it("should get friend username as sender", async () => {
            const friendship = await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });

            const result = await friendshipModel.getFriendUsername(testUsername2, friendship._id.toString());
            expect(result).toBe(testUsername1);
        });

        it("should get nothing when friendship doesn't exist", async () => {
            const result = await friendshipModel.getFriendUsername(testUsername2, new ObjectId().toString());
            expect(result).toBe(null);
        });
    });

    describe("updateConvCursor()", () => {
        it("should update conv cursor", async () => {
            const friendship = await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });

            const result = await friendshipModel.updateConvCursor(testUsername1, new Date(), friendship._id.toString());
            expect(result).toBe(true);
        });

        it("should update conv cursor", async () => {
            const friendship = await friendshipModel.createFriendship({ sender: testUsername1, receiver: testUsername2 });

            const result = await friendshipModel.updateConvCursor(testUsername2, new Date(), friendship._id.toString());
            expect(result).toBe(true);
        });

        it("should return false when friendship doesn't exist", async () => {
            const result = await friendshipModel.updateConvCursor(testUsername1, new Date(), new ObjectId().toString());
            expect(result).toBe(false);
        });
    });
});
