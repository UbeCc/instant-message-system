import { createSlice, PayloadAction } from "@reduxjs/toolkit";
interface AuthState {
    lastUpdateTime: string,
    token: string;
    name: string;
    friends: string;
    groups: string;
    requests: string;
    loginTime: string;
}

// 检查是否在浏览器端执行，然后根据情况决定是否从localStorage中初始化state
const initialState: AuthState = typeof window !== "undefined" ? {
    lastUpdateTime: localStorage.getItem("lastUpdateTime") || "",
    token: localStorage.getItem("token") || "",
    name: localStorage.getItem("name") || "{}",
    friends: localStorage.getItem("friends") || "[]",
    groups: localStorage.getItem("groups") || "[]",
    requests: localStorage.getItem("requests") || "[]",
    loginTime: localStorage.getItem("loginTime") || "0"
} : {
    lastUpdateTime: "",
    token: "",
    name: "",
    friends: "[]",
    groups: "[]",
    requests: "[]",
    loginTime: "0",
};

export const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload;
            if (typeof window !== "undefined") {
                localStorage.setItem("token", action.payload);
            }
        },
        setName: (state, action: PayloadAction<string>) => {
            state.name = action.payload;
            if (typeof window !== "undefined") {
                localStorage.setItem("name", action.payload);
            }
        },
        setFriends: (state, action: PayloadAction<string[]>) => {
            state.friends = JSON.stringify(action.payload);
            if (typeof window !== "undefined") {
                localStorage.setItem("friends", JSON.stringify(action.payload));
            }
        },
        setGroups: (state, action: PayloadAction<string[]>) => {
            state.groups = JSON.stringify(action.payload);
            if (typeof window !== "undefined") {
                localStorage.setItem("groups", JSON.stringify(action.payload));
            }
        },
        setRequests: (state, action: PayloadAction<string[]>) => {
            state.requests = JSON.stringify(action.payload);
            if (typeof window !== "undefined") {
                localStorage.setItem("requests", JSON.stringify(action.payload));
            }
        },
        setLastUpdateTime: (state, action: PayloadAction<string>) => {
            state.lastUpdateTime = action.payload;
            if (typeof window !== "undefined") {
                localStorage.setItem("lastUpdateTime", action.payload);
            }
        },
        setLoginTime: (state, action: PayloadAction<string>) => {
            state.loginTime = action.payload;
            if (typeof window !== "undefined") {
                localStorage.setItem("loginTime", action.payload);
            }
        },
        resetAuth: (state) => {
            state.lastUpdateTime = "";
            state.token = "";
            state.name = "";
            state.friends = "";
            state.groups = "";
            state.requests = "";
            state.loginTime = "";
            if (typeof window !== "undefined") {
                localStorage.removeItem("lastUpdateTime");
                localStorage.removeItem("token"); // 从LocalStorage中移除token
                localStorage.removeItem("name"); // 从LocalStorage中移除name
                localStorage.removeItem("friends"); // 从LocalStorage中移除friends
                localStorage.removeItem("groups"); // 从LocalStorage中移除groups
                localStorage.removeItem("requests"); // 从LocalStorage中移除requests
                localStorage.removeItem("loginTime"); // 从LocalStorage中移除loginTime
            }
        },
    },
});

export const { setToken, setName, setFriends, setLoginTime, setGroups, setRequests, resetAuth, setLastUpdateTime } = authSlice.actions;
export default authSlice.reducer;