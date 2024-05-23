const FRONTEND_URL = process.env.NODE_ENV === "production" ? "https://im-frontend-GitLabRepo.app.secoder.net" : "http://localhost:3000";
const DATABASE_URL = process.env.NODE_ENV === "production" ? "mongodb://10.42.23.29:80" : "mongodb://127.0.0.1:27017";
const TEST_DATABASE_URL = "mongodb://127.0.0.1:27017";

export { FRONTEND_URL, DATABASE_URL, TEST_DATABASE_URL };
