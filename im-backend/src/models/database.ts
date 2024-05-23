import { MongoClient, Db, ServerApiVersion } from "mongodb";
import { DATABASE_URL, TEST_DATABASE_URL } from "../constants/string";

let client: MongoClient;

(async () => {
    if(process.env.NODE_ENV === "test") {
        client = new MongoClient(TEST_DATABASE_URL, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
    } else {
        client = new MongoClient(DATABASE_URL, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        });
    }
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
})();
export async function connectToDatabase(
    uri = DATABASE_URL,
): Promise<Db> {
    return client.db();
}

export async function closeDatabaseConnection() {
    if(client) {
        await client.close();
    }
}
