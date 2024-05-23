import { connectToDatabase, closeDatabaseConnection } from "../../models/database";
import { Db } from "mongodb";

describe("MongoDB Connection", () => {
    it("should connect to the database and return a valid Db instance", async () => {
        const db = await connectToDatabase();
        expect(db).toBeInstanceOf(Db);
    });

    it("should return the same DB instance when called multiple times", async () => {
        const db = await connectToDatabase();
        const db2 = await connectToDatabase();

        expect(db2).toEqual(db);
    });

    it("should close the connection successfully", async () => {
        // 实际关闭操作会清空缓存
        await connectToDatabase();
        await closeDatabaseConnection();
    });
});

