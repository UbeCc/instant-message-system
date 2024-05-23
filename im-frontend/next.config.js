/** @type {import('next').NextConfig} */

const BACKEND_URL = process.env.NODE_ENV === "production" ? "https://im-backend-GitLabRepo.app.secoder.net" : "http://localhost:80";

const nextConfig = {
    output: "standalone",
    reactStrictMode: false, /* @note: To prevent duplicated call of useEffect */
    swcMinify: true,

    async rewrites() {
        return [{
            source: "/:path*",
            destination: BACKEND_URL + "/:path*",
        }];
    }
};

// eslint-disable-next-line no-undef
module.exports = nextConfig;
