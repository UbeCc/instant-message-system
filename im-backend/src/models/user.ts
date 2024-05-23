import { ObjectId, Db } from "mongodb";
import bcrypt from "bcrypt";
import { connectToDatabase, closeDatabaseConnection } from "./database";
import { hashPassword } from "../utils";

export interface User {
  _id?: ObjectId;
  username: string;
  nickname: string;
  password: string;
  lastLoginTime?: Date;
  description?: string;
  email?: string;
  avatar?: string;
  isGhost?: boolean;
}

export interface UserData {
  username: string;
  password: string;
  nickname: string;
}

export interface UserDetails {
  nickname: string;
  lastLoginTime: Date;
  description: string;
  email: string;
  avatar: string;
  password: string;
  username: string;
}

class UserModel {
  private db!: Db;

  /**
   * @summary 初始化数据库连接
   */
  async init() {
    this.db = await connectToDatabase();
  }

  /**
   * @summary 比较用户密码是否和数据库密码匹配
   * @param {string} password - 用户提供的明文密码
   * @param {string} storedPasswordHash - 数据库存储的加密密码
   */
  async comparePasswords(password: string, storedPasswordHash: string): Promise<boolean> {
    // 假设这里使用bcrypt进行密码哈希比较
    const result = await bcrypt.compare(password, storedPasswordHash);
    return result;
  }

  /**
   * @summary 将新用户信息保存至数据库，并返回完整的用户详情
   * @param {UserData} user - 用户数据
   */
  async createUser(user: User): Promise<User> {
    const usersCollection = this.db.collection("user");
    const hashedPassword = await hashPassword(user.password); // 假设有一个 hashPassword 函数用于加密密码
    const newUser = { ...user, password: hashedPassword, lastLoginTime: new Date(), description: "", email: "",
                      avatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=1", isGhost: false};
    await usersCollection.insertOne(newUser);
    return { ...user };
  }

  /**
   * @summary 修改用户信息
   */
  async editUser(username: string, nickname: string, description: string, avatar: string) {
    const usersCollection = this.db.collection("user");
    const user = await usersCollection.findOne<{ username: string, nickname: string, description: string, avatar: string, lastLoginTime: Date }>({ username });
    if (user) {
      user.nickname = nickname;
      user.description = description;
      user.avatar = avatar;
      await usersCollection.updateOne({ username }, { $set: user });
    }
    return user ? { ...user } : null;
  }

  /**
   * @summary 重置密码
   */
  async resetPassword(username: string, newPassword: string) {
    const usersCollection = this.db.collection("user");
    const user = await usersCollection.findOne<{ username: string, password: string }>({ username });
    if (user) {
      user.password = await hashPassword(newPassword);
      await usersCollection.updateOne({ username }, { $set: user });
    }
    return user;
  }

    /**
   * @summary 重置密码
   */
    async editEmail(username: string, email: string) {
      const usersCollection = this.db.collection("user");
      const user = await usersCollection.findOne<{ username: string, nickname: string, email: string }>({ username });
      if (user) {
        user.email = email;
        await usersCollection.updateOne({ username }, { $set: user });
      }
      return user ? { ...user } : null;
    }

  /**
   * @summary 根据用户名查找用户
   * @param {string} username - 用户名称
   * @returns 符合用户名的唯一用户
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const usersCollection = this.db.collection("user");
    const user = await usersCollection.findOne<{ lastLoginTime: Date, username: string, password: string, nickname: string, avatar: string }>({ username });
    return user;
  }

    /**
   * @summary 获取用户详情
   * @param {string} username - 用户名称
   * @returns 符合用户名的唯一用户详情
   */
    async getDetailsByUsername(username: string): Promise<UserDetails | null> {
      const usersCollection = this.db.collection("user");
      const user = await usersCollection.findOne<{
        nickname: string,
        description: string,
        avatar: string,
        email: string,
        lastLoginTime: Date,
        username: string,
        password: string,
      }>({ username });
      return user ? { ...user } : null;
    }

  /**
   * @summary 根据用户昵称查找用户
   * @param {string} nickname - 用户昵称
   * @returns 符合用户昵称的用户数组
   */
  async getUserByNickname(nickname: string): Promise<User[]> {
    const usersCollection = this.db.collection("user");
    const users = await usersCollection.find<{ username: string, password: string, nickname: string, avatar: string }>({ nickname }).toArray();
    return users.map(user => ({ ...user }));
  }

  /**
   * @summary 检查用户是否已经存在
   * @param {string} username - 用户名称
   */
  async checkUsernameExists(username: string) {
    const usersCollection = this.db.collection("user");
    try {
        const user = await usersCollection.findOne({ username });
        return Boolean(user);
    } catch (error) {
        console.error("Error checking if username exists:", error);
        throw new Error(`Failed to check username existence ${error}`);
    }
  }

  /**
   * @summary 删除用户
   * @param {string} username - 用户名称
   */
  async removeUser(username: string): Promise<boolean> {
    const usersCollection = this.db.collection("user");
    try {
        const user = await usersCollection.findOne({ username });
        if (!user) {
          return false;
        } else {
          await usersCollection.updateOne({ username }, { $set: { isGhost: true } });
        return true;
        }
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error(`Error deleting user. ${error}`);
    }
  }

  /**
   * @summary 处理用户登出
   * @param {string} username - 用户名称
   * @returns {boolean} 是否成功登出
   */
  async logout(username: string): Promise<boolean> {
    const usersCollection = this.db.collection("user");
    try {
        const user = await usersCollection.findOne({username});
        if (!user) return false;
        console.log("I UPDATE LOGIN");
        await usersCollection.updateOne({ username }, { $set: { lastLoginTime: new Date() } });
        return true;
    } catch (error) {
        console.error("Error logging out user:", error);
        throw new Error(`Error logging out user. ${error}`);
    }
  }

  /**
   * @summary 关闭数据库连接
   */
  async close() {
    await closeDatabaseConnection();
  }
}

const userModel = new UserModel();

export default UserModel;
export { userModel };