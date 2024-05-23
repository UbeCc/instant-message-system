import React, { useState, useEffect, createContext } from "react";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import store, { RootState } from "../redux/store";
import { useRouter } from "next/router";
import { Provider, useSelector } from "react-redux";
import { BACKEND_URL } from "../constants/string";
import io from "socket.io-client";
import { Button, Layout } from "antd";
import { db } from "../api/db";
import WebSocketContext from "../contexts/WebSocketContext";
import { setLastUpdateTime } from "../redux/auth";
import { Socket } from "socket.io-client";
import { useDispatch } from "react-redux";

const { Content, Footer } = Layout;

export interface Message {
    id: string;
    content: string;
    sender: string;
    createTime: Date;
    conversation: string;
}

export interface UserCursor {
    [conversationID: string]: {
      [username: string]: Date;
    };
}

interface UserCursorContextType {
    userCursor: UserCursor;
    updateUserCursor: (cursor: UserCursor) => void;
    receivedMsgIds: string[];
}

export const UserCursorContext = createContext<UserCursorContextType | undefined>(undefined);

// eslint-disable-next-line @typescript-eslint/naming-convention
const App = ({ Component, pageProps }: AppProps) => {
    const [userCursor, setUserCursor] = useState<UserCursor>({});
    const updateUserCursor = async (newCursor: UserCursor) => {
        console.log("I UPDATE CURSOR");
        console.log("BEFORE", userCursor);
        setUserCursor(newCursor);
        console.log("AFTER", newCursor);
    };
    const [socket, setSocket] = useState<Socket>();
    const router = useRouter();
    const token = useSelector((state: RootState) => state.auth.token);
    const username = useSelector((state: RootState) => state.auth.name);
    const dispatch = useDispatch();
    const [curUsername, setCurUsername] = useState<string>("");
    const loginTime = useSelector((state: RootState) => state.auth.loginTime);
    const [receivedMsgIds, setReceivedMsgIds] = useState<string[]>([]);

    useEffect(() => {
        console.log("NEW INIT");
        async function init() {
            const data = await fetch(`${BACKEND_URL}/api/user/${username}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${token}`,
                },
            });
            const res = await data.json();
            if(res.code === 0) {
                console.log("START INIT");
                const curUserCursor = await db.initConversations(token, username);
                console.log("CURUSERCURSOR", curUserCursor);
                if(updateUserCursor && curUserCursor) await updateUserCursor(curUserCursor);
                console.log("AFTER INIT", userCursor);
            }
        }
        init();
      }, [loginTime]);

    useEffect(() => {
        const curSocket = io(BACKEND_URL, {
            transports: ["websocket"],
            auth: { token }
        });
        if(username !== curUsername) {
            curSocket.off(); // 清除原有所有通信事件
            curSocket.emit("set username", username);
            setCurUsername(username);
        }

        curSocket.on("update_member_cursor", async (memberName: string, conversationID: string, cursor: string) => {
            const newCursor = userCursor;
            if(newCursor[conversationID] === undefined) {
                newCursor[conversationID] = {};
            }
            console.log("SOCKETID", conversationID);
            newCursor[conversationID][memberName] = new Date(cursor);
            await updateUserCursor(newCursor);
        });

        curSocket.on("private_chat", async (message) => {
            const activeConversationId = db.activeConversationId;
            if(activeConversationId !== message.conversation && message.sender !== username) {
                console.log("RECEIVE PRIVATE CHAT");
                await db.incrementUnreadCount(message.conversation);
            }
            message.createTime = new Date(message.createTime);
            const frontendMes = {
                id: message._id,
                content: message.content,
                sender: message.sender,
                createTime: message.createTime,
                conversation: message.conversation
            };
            db.addMessage(frontendMes);
            dispatch(setLastUpdateTime(new Date().toString()));
        });

        curSocket.on("send_msg_successfully", (messageId: string) => {
            setReceivedMsgIds((prev) => [...prev, messageId]);
        });

        curSocket.on("group_chat", async (message) => {
            console.log("RECEIVE GROUP CHAT");
            const activeConversationId = db.activeConversationId;
            if(activeConversationId !== message.conversation && message.sender !== username) {
                await db.incrementUnreadCount(message.conversation);
            }
            message.createTime = new Date(message.createTime);
            const frontendMes = {
                id: message.id,
                content: message.content,
                sender: message.sender,
                createTime: message.createTime,
                conversation: message.conversation
            };
            db.addMessage(frontendMes);
            dispatch(setLastUpdateTime(new Date().toString()));
        });
        setSocket(() => curSocket);

        return () => {
            curSocket.disconnect();
        };
      }, [loginTime]);

    return (
            router.pathname !== "/login" && router.pathname !== "/register" ? (
            Object.keys(token).length !== 0 ? (
                <UserCursorContext.Provider value={{ userCursor, updateUserCursor, receivedMsgIds }}>
                    <WebSocketContext.Provider value={socket}>
                        <Component {...pageProps} />
                    </WebSocketContext.Provider>
                </UserCursorContext.Provider>
            ) : (
                <>
                    <Layout style={{ minHeight: "100vh" }}>
                        <Content style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "0 48px" }}>
                            <div style={{ width: "100%", maxWidth: 600 }}>
                                <h1 style={{ textAlign: "center", marginBottom: 24 }}>Instant Message System</h1>
                                <div style={{ textAlign: "center" }}>
                                    <p>未登录</p>
                                    <Button type="primary" onClick={() => router.push("/login")}>
                                        登录或注册
                                    </Button>
                                </div>
                            </div>
                        </Content>
                        <Footer style={{ textAlign: "center" }}>
                            Ant Design ©{new Date().getFullYear()} Created by Ant UED
                        </Footer>
                    </Layout>
                </>
            )) : (
                <Component {...pageProps} />
            )
    );
};

export default function AppWrapper(props: AppProps) {
    return (
        <Provider store={store}>
            <App {...props} />
        </Provider>
    );
}
