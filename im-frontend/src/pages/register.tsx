import { useState } from "react";
import { BACKEND_URL, REGISTER_SUCCESS_PREFIX, REGISTER_FAILED } from "../constants/string";
import { useRouter } from "next/router";
import { setName, setToken } from "../redux/auth";
import { useDispatch } from "react-redux";
import React from "react";
import { Button, Form, Input, Layout, Space, theme } from "antd";

interface FieldType {
    username?: string;
    nickname?: string;
    password?: string;
    retypePassword?: string;
}

const { Content, Footer } = Layout;

const RegisterScreen = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");

    const router = useRouter();
    const dispatch = useDispatch();
    const [form] = Form.useForm();

    const register = async () => {
        console.log(`REGISTER URL: ${BACKEND_URL}/api/register`);
        try {
            const res = await fetch(`${BACKEND_URL}/api/register`, {
                method: "POST",
                body: JSON.stringify({
                    username,
                    nickname,
                    password,
                }),
            });

            const data = await res.json();
            if (Number(data.code) === 0) {
                dispatch(setName(username));
                dispatch(setToken(data.token));
                alert(REGISTER_SUCCESS_PREFIX + username);
                // TODO: Redirect to where?
                router.back();
            } else {
                alert(REGISTER_FAILED);
            }
        } catch(err) {
            alert(`Registration error: ${err}`);
        }
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        form.validateFields(["retypePassword"]); // 重新验证
    };

    const {
        token: { borderRadiusLG },
    } = theme.useToken();

    return (
        <>
            <Layout style={{ minHeight: "100vh" }}>
                <Content style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "0 48px" }}>
                    <div style={{ width: "100%", maxWidth: 600 }}>
                        <h1 style={{ textAlign: "center", marginBottom: 24 }}>Instant Message System</h1>
                        <div
                            style={{
                                padding: 24,
                                borderRadius: borderRadiusLG,
                                paddingRight: "100px",
                            }}
                        >
                            <Form
                                form={form}
                                name="basic"
                                labelCol={{ span: 8 }}
                                wrapperCol={{ span: 16 }}
                                style={{ maxWidth: 600 }}
                                initialValues={{ remember: true }}
                                onFinish={register}
                                autoComplete="off"
                            >
                                <Form.Item<FieldType>
                                    label="用户名"
                                    name="username"
                                    tooltip="注册后无法修改。长度为 3~15，仅含字母、数字和下划线。"
                                    rules={[
                                        { required: true, message: "请输入用户名" },
                                        { min: 3, message: "用户名长度不能少于 3 个字符" },
                                        { max: 15, message: "用户名长度不能超过 15 个字符" },
                                        { pattern: /^[a-zA-Z0-9_]+$/, message: "用户名仅可包含字母、数字和下划线" }
                                    ]}
                                >
                                    <Input onChange={(e) => setUsername(e.target.value)} />
                                </Form.Item>

                                <Form.Item<FieldType>
                                    label="昵称"
                                    name="nickname"
                                    tooltip="注册后可以修改。长度为 3~15，仅含字母、数字和下划线。"
                                    rules={[
                                        { required: true, message: "请输入昵称" },
                                        { min: 3, message: "昵称长度不能少于 3 个字符" },
                                        { max: 15, message: "昵称长度不能超过 15 个字符" },
                                        { pattern: /^[a-zA-Z0-9_]+$/, message: "昵称仅可包含字母、数字和下划线" }
                                    ]}
                                >
                                    <Input onChange={(e) => setNickname(e.target.value)} />
                                </Form.Item>

                                <Form.Item<FieldType>
                                    label="密码"
                                    name="password"
                                    tooltip="长度为 6~20，仅含字母、数字和下划线。"
                                    rules={[
                                        { required: true, message: "请输入密码" },
                                        { min: 6, message: "密码长度不能少于 6 个字符" },
                                        { max: 20, message: "密码长度不能超过 20 个字符" },
                                        { pattern: /^[a-zA-Z0-9_]+$/, message: "密码仅可包含字母、数字和下划线" }
                                    ]}
                                >
                                    <Input.Password onChange={(e) => handlePasswordChange(e.target.value)} />
                                </Form.Item>

                                <Form.Item<FieldType>
                                    label="再次输入密码"
                                    name="retypePassword"
                                    rules={[
                                        { required: true, message: "Please input your password again!" },
                                        ({getFieldValue}) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue("password") === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error("The two passwords that you entered do not match!"));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password />
                                </Form.Item>
                            </Form>
                        </div>
                        <div style={{ textAlign: "center", marginTop: -25}}>
                            <Space>
                                <Button type="primary" onClick={register}>
                                    注册
                                </Button>
                                <Button type="default" onClick={() => router.push("/login")}>
                                    返回
                                </Button>
                            </Space>
                        </div>
                    </div>
                </Content>
                <Footer style={{ textAlign: "center" }}>
                    Ant Design ©{new Date().getFullYear()} Created by Ant UED
                </Footer>
            </Layout>
        </>
    );
};

export default RegisterScreen;