import { useState } from "react";
import { BACKEND_URL, FAILURE_PREFIX, LOGIN_FAILED, USER_DEACTIVATED, LOGIN_SUCCESS_PREFIX } from "../constants/string";
import { useRouter } from "next/router";
import { setLoginTime, setFriends, setGroups, setRequests, setName, setToken } from "../redux/auth";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { getFriends, getGroups } from "../utils/fetch";
import { Button, Checkbox, Form, Input, Layout, theme } from "antd";

import React from "react";
import { FriendData, GroupData, RequestData } from "../types/userinfo";

const { Content, Footer } = Layout;

interface FieldType {
    username?: string;
    password?: string;
    remember?: string;
}

const LoginScreen = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const dispatch = useDispatch();
    const loginTime = useSelector((state: RootState) => state.auth.loginTime);

    const login = async (curLoginTime: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/login`, {
                method: "POST",
                body: JSON.stringify({
                    username,
                    password,
                }),
            });
            const data = await res.json();

            if (Number(data.code) === 0) {
                const token = data.token;
                const friends = await getFriends(token);
                const groups = await getGroups(token);
                const requests = await getGroups(token);
                dispatch(setName(username));
                dispatch(setToken(token));
                const intLoginTime = parseInt(curLoginTime) + 1;
                dispatch(setLoginTime(intLoginTime.toString()));
                dispatch(setFriends(friends.map((friend: FriendData) => {
                    return friend.username;
                })));
                dispatch(setGroups(groups.map((group: GroupData) => {
                    return group.groupID;
                })));
                dispatch(setRequests(requests.map((request: RequestData) => {
                    return request.requestID;
                })));
                alert(LOGIN_SUCCESS_PREFIX + username);
                router.push("/");
            } else if(Number(data.code) === -2) {
                alert(USER_DEACTIVATED);
            } else {
                alert(LOGIN_FAILED);
            }
        } catch(err) {
            alert(FAILURE_PREFIX + err);
        }
    };

    const {
        token: { borderRadiusLG },
    } = theme.useToken();

    return (
        <>
            <Layout style={{ minHeight: "100vh" }}>
                <Content style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "0 0" }}>
                    <div style={{ }}>
                        <h1 style={{ textAlign: "center", marginBottom: 24 }}>Instant Message System</h1>
                        <div
                            style={{
                                borderRadius: borderRadiusLG,
                            }}
                        >
                            <Form
                                name="basic"
                                labelCol={{ span: 8 }}
                                initialValues={{ remember: true }}
                                onFinish={() => {login(loginTime);}}
                                autoComplete="off"
                            >
                                <Form.Item<FieldType>
                                    name="username"
                                >
                                    <Input
                                        prefix={<UserOutlined />}
                                        placeholder="用户名"
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </Form.Item>

                                <Form.Item<FieldType>
                                    name="password"
                                >
                                    <Input.Password
                                        prefix={<LockOutlined />}
                                        placeholder="密码"
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item<FieldType>
                                    name="remember"
                                    valuePropName="checked"
                                >
                                    <Checkbox>记住用户名</Checkbox>
                                </Form.Item>
                            </Form>
                        </div>
                        <div style={{ textAlign: "center", marginTop: -15, marginBottom: 10}}>
                            <Button type="primary" onClick={() => {login(loginTime);}} style={{width: "100%"}}>
                                登录
                            </Button>
                        </div>
                        <span>或是<a href = "/register" style={{color: "#1677ff"}}>注册</a></span>
                    </div>
                </Content>
                <Footer style={{ textAlign: "center" }}>
                    Ant Design ©{new Date().getFullYear()} Created by Ant UED
                </Footer>
            </Layout>
        </>
    );
};

export default LoginScreen;
