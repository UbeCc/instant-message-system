import { useState, useEffect } from "react";
import { AVATAR_EXAMPLE, BACKEND_URL, FAILURE_PREFIX, GET_PROFILE_FAILED, GET_FRIEND_FAILED, REMOVE_FAILED, REMOVE_SUCCESS_PREFIX, EDIT_FAILED, EDIT_SUCCESS_PREFIX } from "../../constants/string";
import { resetAuth, setRequests } from "../../redux/auth";
import { RootState } from "../../redux/store";
import { useSelector, useDispatch } from "react-redux";
import { Button, Space, Badge, Popconfirm } from "antd";
import { LoadingOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { message, Upload, Form, Input, } from "antd";
import type { GetProp, UploadProps } from "antd";
import { RequestData } from "../../types/userinfo";
import { useRouter } from "next/router";

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

const getBase64 = (img: FileType, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => callback(reader.result as string));
    reader.readAsDataURL(img);
};

const beforeUpload = (file: FileType) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
        message.error("You can only upload JPG/PNG file!");
    }
    const isLt2M = file.size / 1024 / 1024 < 5;
    if (!isLt2M) {
        message.error("Image must smaller than 5MB!");
    }
    return isJpgOrPng && isLt2M;
};

interface ProfileProps {
    targetUsername: string;
}

interface UserData {
    username: string;
    nickname: string;
    description: string;
    avatar: string;
    email: string;
    lastLoginTime: string;
    password: string;
    isOnline: boolean;
}

interface FieldType {
    oldPassword?: string;
    newPassword?: string;
    retypePassword?: string;
    email?: string;
    password?: string;
}

const { TextArea } = Input;

const UserProfileUI = (props: ProfileProps) => {
    const dispatch = useDispatch();
    const username = useSelector((state: RootState) => state.auth.name);
    const token = useSelector((state:RootState) => state.auth.token);
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState<string>(AVATAR_EXAMPLE);
    const [newPassword, setNewPassword] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [password2Check, setPassword2Check] = useState("");
    const [isFriend, setIsFriend] = useState(false);
    const [tag, setTag] = useState("");

    const [userData, setUserData] = useState<UserData>({
        username: props.targetUsername,
        nickname: "",
        password: "",
        email: "",
        isOnline: false,
        lastLoginTime: "",
        description: "",
        avatar: "",
    });

    const [emailForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    const fetchUserData = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/user/${props.targetUsername}`, {
                method: "GET",
                headers: {
                    Authorization: token,
                },
            });
            const data = await response.json();
            if (Number(data.code) === 0) {
                const currentUserData = data.user;

                console.log("USERDATA: ", currentUserData);
                setUserData(currentUserData);
                setFormValues({
                    nickname: data.user.nickname,
                    description: data.user.description,
                });
                setAvatar(data.user.avatar);
            } else {
                alert(GET_PROFILE_FAILED);
            }
        } catch (error) {
            alert(FAILURE_PREFIX + error);
        }
    };
    const checkIsFriend = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/check/friend`, {
                method: "POST",
                headers: {
                    Authorization: token,
                },
                body: JSON.stringify({
                    username: props.targetUsername,
                }),
            });
            const data = await response.json();
            if (Number(data.code) === 0) {
                setIsFriend(data.result);
                setTag(data.tag);
            } else {
                alert(GET_FRIEND_FAILED);
            }
        } catch (error) {
            alert(FAILURE_PREFIX + error);
        }
    };

    useEffect(() => {
        // 调用异步函数
        if (props.targetUsername !== undefined) {
            console.log("TARGETUSERNAME: ", props.targetUsername);
            fetchUserData();
            checkIsFriend();
        }
    }, [props.targetUsername]);

    const [formValues, setFormValues] = useState({
        nickname: "",
        description: "",
    });

    const handleChange: UploadProps["onChange"] = (info) => {
        if (info.file.status === "uploading") {
            setLoading(true);
            setAvatar("");
            return;
        }
        if (info.file.status === "done") {
            getBase64(info.file.originFileObj as FileType, (url) => {
                setLoading(false);
                setAvatar(url);
            });
        }
    };

    const uploadButton = (
        <button style={{ border: 0, background: "none" }} type="button">
            {loading ? <LoadingOutlined /> : <PlusOutlined />}
            <div style={{ marginTop: 8 }}>Upload</div>
        </button>
    );

    const handleEmailChange = (value: string) => {
        setNewEmail(value);
    };

    const handlePasswordChange = (value: string) => {
        setPassword2Check(value);
    };

    const handleOldPasswordChange = (value: string) => {
        setOldPassword(value);
    };

    const handleNewPasswordChange = (value: string) => {
        setNewPassword(value);
        passwordForm.validateFields(["retypePassword"]); // 重新验证
    };

    const remove = () => {
        // alert("Username: " + username + "\n Password: " + password);
        fetch(`${BACKEND_URL}/api/remove/user`, {
            method: "DELETE",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                username,
            }),
        })
            .then((res) => res.json())
            .then((res) => {
                if (Number(res.code) === 0) {
                    alert(REMOVE_SUCCESS_PREFIX + username);
                    router.push("/login"); // 1)
                    dispatch(resetAuth()); // 2)
                    // 这里的顺序是否需要改变
                } else {
                    alert(REMOVE_FAILED);
                }
            })
            .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const edit = () => {
        fetch(`${BACKEND_URL}/api/user/edit`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                username: userData.username,
                nickname: formValues.nickname,
                description: formValues.description,
                avatar,
                lastLoginTime: userData.lastLoginTime,
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert(EDIT_SUCCESS_PREFIX + userData.username);
                router.push(`/user?username=${userData.username}`);
            } else {
                alert(EDIT_FAILED);
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const changePassword = async () => {
        fetch(`${BACKEND_URL}/api/user/edit`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                oldPassword,
                newPassword,
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert(EDIT_SUCCESS_PREFIX + userData.username);
                router.push(`/user?username=${userData.username}`);
            } else {
                alert(EDIT_FAILED);
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const changeEmail = async () => {
        fetch(`${BACKEND_URL}/api/user/edit`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                email: newEmail,
                oldPassword: password2Check,
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert(EDIT_SUCCESS_PREFIX + userData.username);
                router.push(`/user?username=${userData.username}`);
            } else {
                alert(EDIT_FAILED);
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const request = () => {
        fetch(`${BACKEND_URL}/api/request/send`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                username,
                group_id: "",
                receiver: props.targetUsername,
                sender: username,
                type: "friend",
                reason: username + " wants to be your friend.",
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert("Friend request sent successfully!");
                router.push("/request");
            } else {
                alert("Friend request failed!");
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const removeFriend = () => {
        fetch(`${BACKEND_URL}/api/remove/friend`, {
            method: "DELETE",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                username: props.targetUsername,
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert("Friend deleted successfully!");
                router.push("/");
            } else {
                alert("Friend delete failed!");
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const editTag = () => {
        fetch(`${BACKEND_URL}/api/tag`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                username: props.targetUsername,
                tag,
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert("Friend tag edited successfully!");
                router.push(`/user?username=${userData.username}`);
            } else {
                alert("Friend tag edited failed!");
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const convertToLocaleTime = (time: string): string => {
        const date = new Date(time);
        const localTime = date.toLocaleString("zh-CN", {year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"});
        return localTime.replace("/", "年").replace("/", "月").replace(" ", "日 ");
    };

    return (
        <>
            <h1>个人信息</h1>
            <h2>基本信息</h2>
            <Form
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 14 }}
                layout="horizontal"
                disabled={username !== userData.username}
                style={{ maxWidth: 600 }}
            >
                <Form.Item label="用户名">
                    <Input value={userData.username} disabled={true} />
                </Form.Item>
                <Form.Item label="昵称">
                    <Input
                        value={formValues.nickname}
                        onChange={(e) => setFormValues({ ...formValues, nickname: e.target.value })}
                    />
                </Form.Item>
                <Form.Item label="邮箱">
                    <Input value={userData.email} disabled={true} />
                </Form.Item>
                <Form.Item label="当前状态">
                    <Space>
                        {userData.isOnline ? (<Badge status="success" text="在线" />) : (
                            <Space>
                                <Badge status="default" text="离线" />
                                <span>上次登录时间：{convertToLocaleTime(userData.lastLoginTime)}</span>
                            </Space>
                        )}
                        <Button onClick={()=>{fetchUserData();}} icon={<ReloadOutlined />}>刷新状态</Button>
                    </Space>
                </Form.Item>
                <Form.Item label="个人简介">
                    <TextArea
                        value={formValues.description}
                        onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                        rows={4}
                    />
                </Form.Item>
                <Form.Item label="头像">
                    <Upload
                        name="avatar"
                        listType="picture-card"
                        className="avatar-uploader"
                        showUploadList={false}
                        beforeUpload={beforeUpload}
                        onChange={handleChange}
                    >
                        {avatar ? <img src={avatar} alt="avatar" style={{ width: "100%" }} /> : uploadButton}
                    </Upload>
                </Form.Item>
            </Form>
            <div>
                {username === props.targetUsername ? (
                    <Space>
                        <Button type="primary" onClick={edit}>修改个人信息</Button>
                        <Popconfirm
                            title="确定要注销账号吗？"
                            description="此操作不可撤销。"
                            onConfirm={remove}
                            okText="是"
                            cancelText="否"
                        >
                            <Button type="primary" danger>注销账号</Button>
                        </Popconfirm>
                    </Space>
                ) : (
                    isFriend ? (
                        <>
                            <Form
                                labelCol={{ span: 4 }}
                                wrapperCol={{ span: 14 }}
                                layout="horizontal"
                                style={{ maxWidth: 600 }}
                            >
                                <Form.Item label="分组">
                                    <Input value={tag}
                                        onChange={(e) => setTag(e.target.value)}
                                    />
                                </Form.Item>
                            </Form>
                            <Space>
                                <Button type="primary" onClick={editTag}>修改分组</Button>
                                <Popconfirm
                                    title="确定要删除好友吗？"
                                    description="此操作不可撤销。"
                                    onConfirm={removeFriend}
                                    okText="是"
                                    cancelText="否"
                                >
                                    <Button type="primary" danger >删除好友</Button>
                                </Popconfirm>
                            </Space>

                        </>
                    ) : <Button type="primary" onClick={request}>申请好友</Button>
                )}
            </div>
            {username === props.targetUsername ? (
                <>
                    <h2>修改邮箱</h2>
                    <Form
                        form={emailForm}
                        name="basic"
                        labelCol={{ span: 8 }}
                        wrapperCol={{ span: 16 }}
                        style={{ maxWidth: 600 }}
                        initialValues={{ remember: true }}
                        onFinish={changeEmail}
                        autoComplete="off"
                    >
                        <Form.Item<FieldType>
                            label="邮箱"
                            name="email"
                            rules={[
                                {
                                    type: "email",
                                    message: "请输入有效的邮箱地址！",
                                },
                            ]}
                        >
                            <Input onChange={(e) => handleEmailChange(e.target.value)} />
                        </Form.Item>
                        <Form.Item<FieldType>
                            label="密码"
                            name="password"
                            rules={[{ required: true, message: "请输入您的密码" }]}
                        >
                            <Input.Password onChange={(e) => handlePasswordChange(e.target.value)} />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit">
                                修改邮箱
                            </Button>
                        </Form.Item>
                    </Form>
                    <h2>修改密码</h2>
                    <Form
                        form={passwordForm}
                        name="basic"
                        labelCol={{ span: 8 }}
                        wrapperCol={{ span: 16 }}
                        style={{ maxWidth: 600 }}
                        initialValues={{ remember: true }}
                        onFinish={changePassword}
                        autoComplete="off"
                    >
                        <Form.Item<FieldType>
                            label="原密码"
                            name="oldPassword"
                            rules={[{ required: true, message: "请输入您的原密码" }]}
                        >
                            <Input.Password onChange={(e) => handleOldPasswordChange(e.target.value)} />
                        </Form.Item>

                        <Form.Item<FieldType>
                            label="新密码"
                            name="newPassword"
                            rules={[{ required: true, message: "请输入您的新密码" }]}
                        >
                            <Input.Password onChange={(e) => handleNewPasswordChange(e.target.value)} />
                        </Form.Item>

                        <Form.Item<FieldType>
                            label="再次输入新密码"
                            name="retypePassword"
                            rules={[
                                { required: true, message: "请再次输入您的新密码" },
                                ({getFieldValue}) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue("newPassword") === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error("您的两次输入密码不匹配"));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit">
                                修改密码
                            </Button>
                        </Form.Item>
                    </Form>
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export default UserProfileUI;