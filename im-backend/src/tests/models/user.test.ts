import { userModel } from "../../server";
import { connectToDatabase } from "../../models/database";
import { UserData } from "../../models/user";
import { hashPassword } from "../../utils";
import { ObjectId } from "mongodb";

describe("UserModel", () => {
    const testUsername = "test-username";
    const testPassword = "test-password";
    const testNickname = "test-nickname";
    const testAvatar = "https://api.dicebear.com/7.x/miniavs/svg?seed=1";
    const newAvatar = "new-avatar";
    const newNickname = "new-nickname";
    const newDescripition = "new-description";
    const newEmail = "new-email";
    const userData: UserData = {
        username: testUsername,
        password: testPassword,
        nickname: testNickname,
    };

    beforeAll(async () => {
        await userModel.init();
    });
    beforeEach(async () => {
        // 清空或重置测试集合
        const db = await connectToDatabase();
        await db.collection("user").deleteMany({});
    });
    afterAll(async () => {
        await userModel.close();
    });

    describe("hashPassword()", () => {
        it("should generate a hashed password given a plaintext password", async () => {
            const plainTextPassword = testPassword;
            const hashedPassword = await hashPassword(plainTextPassword);

            // 我们通常不会在这里检查具体的哈希值，而是确认其长度和结构
            expect(hashedPassword).toBeTruthy();
            expect(typeof hashedPassword === "string").toBe(true);
        });
    });

    describe("comparePasswords()", () => {
        it("should correctly compare passwords", async () => {
            const plainTextPassword = testPassword;
            const hashedPassword = await hashPassword(plainTextPassword);

            const isMatch = await userModel.comparePasswords(plainTextPassword, hashedPassword);
            expect(isMatch).toBe(true);
        });
    });

    describe("createUser()", () => {
        it("should create a new user in the database", async () => {
            await userModel.createUser(userData);

            // 模拟查询数据库以验证用户已创建
            const db = await connectToDatabase();
            const insertedUser = await db.collection("user").findOne<{username: string, nickname: string}>({ username: userData.username });
            expect(insertedUser).toBeTruthy();
            // 验证一些基本字段的存在和正确性
            expect(insertedUser?.username).toBe(userData.username);
            expect(insertedUser?.nickname).toBe(userData.nickname);
            // 注意，由于安全原因，我们不能直接比较密码哈希
        });
    });


    describe("editUser()", () => {
        it("should update an existing user's information", async () => {
            // 先创建一个用户以便编辑
            await userModel.createUser(userData);

            const updatedData = {
                nickname: newNickname,
                description: newDescripition,
                avatar: newAvatar,
                email: newEmail,
            };

            const editedUser = await userModel.editUser(
                userData.username,
                updatedData.nickname,
                updatedData.description,
                updatedData.avatar
            );

            expect(editedUser).toEqual(expect.objectContaining({
                nickname: updatedData.nickname,
                description: updatedData.description,
                avatar: updatedData.avatar
            }));

            const verifiedUser = await userModel.getDetailsByUsername(userData.username);
            expect(verifiedUser).toEqual(expect.objectContaining(editedUser));
        });
    });

    describe("editEmail()", () => {
        it("should update an existing user's email", async () => {
            // 先创建一个用户以便编辑
            await userModel.createUser(userData);

            const editedUser = await userModel.editEmail(
                userData.username, newEmail
            );

            expect(editedUser).toEqual(expect.objectContaining({
                email: newEmail
            }));

            const verifiedUser = await userModel.getDetailsByUsername(userData.username);
            expect(verifiedUser).toEqual(expect.objectContaining(editedUser));
        });
    });

    describe("getUserByUsername()", () => {
        it("should retrieve a user by its username", async () => {
            await userModel.createUser(userData);

            const foundUser = await userModel.getUserByUsername(userData.username);
            expect(foundUser).toEqual(expect.objectContaining({
                username: userData.username,
                nickname: userData.nickname,
                password: expect.any(String),
                avatar: testAvatar
            }));
        });

        it("should return null when no user is found with the given username", async () => {
            const nonExistentUser = await userModel.getUserByUsername("nonexistent");
            expect(nonExistentUser).toBeNull();
        });
    });

    describe("getDetailsByUsername()", () => {
        it("should retrieve detailed user info by its username", async () => {
            await userModel.createUser(userData);

            const foundUserDetails = await userModel.getDetailsByUsername(userData.username);
            expect(foundUserDetails).toEqual(expect.objectContaining({
                _id: expect.any(ObjectId),
                username: testUsername,
                nickname: testNickname,
                password: expect.any(String),
                avatar: testAvatar,
                description: "",
                email: "",
                isGhost: false,
                lastLoginTime: expect.any(Date),
            }));
        });

        it("should return null when no user is found with the given username", async () => {
            const notFoundUser = await userModel.getDetailsByUsername("not-found");
            expect(notFoundUser).toBeNull();
        });
    });

    describe("getUserByNickname()", () => {
        it("should retrieve users by their nickname", async () => {
            const user1 = {
                username: "user1",
                password: "pass1",
                nickname: "The Nickname"
            };
            const user2 = {
                username: "user2",
                password: "pass2",
                nickname: "The Nickname"
            };

            await userModel.createUser(user1);
            await userModel.createUser(user2);

            const foundUsers = await userModel.getUserByNickname(user1.nickname);
            expect(foundUsers).toHaveLength(2);
            expect(foundUsers).toEqual(expect.arrayContaining([
                expect.objectContaining({ _id: expect.any(ObjectId), nickname: "The Nickname", avatar: testAvatar, email: "", description: "", lastLoginTime: expect.any(Date), password: expect.any(String), username: "user1", isGhost: false}),
                expect.objectContaining({ _id: expect.any(ObjectId), nickname: "The Nickname", avatar: testAvatar, email: "", description: "", lastLoginTime: expect.any(Date), password: expect.any(String), username: "user2", isGhost: false}),
            ]));
        });

        it("should return an empty array when no users have the given nickname", async () => {
            const nonexistentNickname = "no-match";
            const usersWithNickname = await userModel.getUserByNickname(nonexistentNickname);
            expect(usersWithNickname).toEqual([]);
        });
    });

    describe("getUserByNickname()", () => {
        it("should return true when a user with the given username exists", async () => {
            const existingUser = {
                username: "existsUser",
                password: "validPass",
                nickname: "Existing User",
            };
            await userModel.createUser(existingUser);

            const doesExist = await userModel.checkUsernameExists(existingUser.username);
            expect(doesExist).toBeTruthy();
        });

        it("should return false when a user with the given username does not exist", async () => {
            const nonExistentUsername = "nonExistentUser";
            const doesNotExist = await userModel.checkUsernameExists(nonExistentUsername);
            expect(doesNotExist).toBeFalsy();
        });
    });

    describe("getUserByNickname()", () => {
        it("should delete a user from the database", async () => {
            await userModel.createUser(userData);

            const deletionResult = await userModel.removeUser(userData.username);
            expect(deletionResult).toBeTruthy();

            // Check that the user has been deleted
            const db = await connectToDatabase();
            const user = await db.collection("user").findOne({ username: userData.username });
            expect(user?.isGhost).toBeTruthy();
        });

        it("should return false if the user was not found and hence could not be deleted", async () => {
            const nonExistentUser = "notInDb";
            const deletionResult = await userModel.removeUser(nonExistentUser);
            expect(deletionResult).toBeFalsy();
        });
    });
});
