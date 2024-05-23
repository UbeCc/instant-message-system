import { BACKEND_URL } from "../constants/string";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { Button, Divider, Space } from "antd";
import { resetAuth } from "../redux/auth";
import {
    DesktopOutlined,
    BarsOutlined,
    UserOutlined,
    CommentOutlined,
    QuestionCircleOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Layout, Menu, theme } from "antd";
import HomePage from "./conversations/HomePage";
import RequestUI from "./RequestUI";
import SearchUI from "./search/SearchUI";
import UserProfileUI from "./profile/UserProfileUI";
import ListUI from "./list/ListUI";
import GroupProfileUI from "./profile/GroupProfileUI";
import { RootState } from "../redux/store";

const { Header, Content, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[],
): MenuItem {
    return {
        key,
        icon,
        children,
        label,
    } as MenuItem;
}

interface LayoutUIProps {
    username: string,
    typeOfProfile: string,
}

const LayoutUI = (props: LayoutUIProps) => {
    const {
        token: { colorBgContainer },
    } = theme.useToken();
    const token = useSelector((state: RootState) => state.auth.token);
    const router = useRouter();
    const dispatch = useDispatch();
    const username = useSelector((state: RootState) => state.auth.name);

    const items: MenuItem[] = [
        getItem("聊天", "chat", <CommentOutlined />),
        getItem("列表", "list", <BarsOutlined />),
        getItem("好友/群聊审批", "request", <DesktopOutlined />),
        getItem("搜索好友/群聊", "search", <QuestionCircleOutlined />),
        getItem("个人信息", "profile", <UserOutlined />),
    ];

    const logout = async () => {
        await fetch(`${BACKEND_URL}/api/logout`, {
            method: "GET",
            headers: {
                Authorization: token,
            }
        });
        dispatch(resetAuth());
        router.push("/login");

    };

    return (
        <>
            <Layout style={{ minHeight: "100vh" }}>
                <Sider
                       style={{ overflow: "auto", height: "100vh", position: "fixed" }}
                >
                    <Divider style={{color: "white"}}>
                        <a href="/">Instant Message System</a>
                    </Divider>
                    <Menu
                        theme="dark"
                        mode="inline"
                        items={items}
                        onSelect={(item) => {
                            // 根据点击的菜单项修改 URL
                            const key = item.key.toString();
                            switch (key) {
                                case "chat":
                                    router.push("/chat");
                                    break;
                                case "list":
                                    router.push("/list");
                                    break;
                                case "request":
                                    router.push("/request");
                                    break;
                                case "search":
                                    router.push("/search");
                                    break;
                                case "profile":
                                    router.push(`/user?username=${username}`);
                                    break;
                                default:
                                    break;
                            }
                        }}
                        defaultSelectedKeys={[props.typeOfProfile]}
                    />
                </Sider>
                <Layout style={{ marginLeft: 200 }}>
                    <Header style={{ padding: 0, background: colorBgContainer }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "100%" }}>
                            <Space style={{marginRight: "10px"}}>
                                <span>您好，用户</span>
                                <Button type="text" onClick={() => router.push(`/user?username=${username}`)}
                                    style={{color: "#1677ff"}}
                                >
                                    {username}
                                </Button>
                                <Button type="primary" danger onClick={logout}>
                                    退出登录
                                </Button>
                            </Space>
                        </div>
                    </Header>
                    <Content style={{ margin: "0 16px" }}>
                        {
                            props.typeOfProfile === "index" ? (
                                <></>
                            ) : (
                                props.typeOfProfile === "chat" ? (
                                    <HomePage />
                                ) : (
                                    props.typeOfProfile === "list" ? (
                                        <ListUI />
                                    ) : (
                                        props.typeOfProfile === "request" ? (
                                            <RequestUI />
                                        ) : (
                                            props.typeOfProfile === "search" ? (
                                                <SearchUI />
                                            ) : (
                                                props.typeOfProfile === "profile" ? (
                                                    <UserProfileUI targetUsername={username} />
                                                ) : (
                                                    props.typeOfProfile === "user" ? (
                                                        <UserProfileUI targetUsername={props.username} />
                                                    ) : (
                                                        props.typeOfProfile === "group" ? (
                                                            <GroupProfileUI targetGroupname={props.username} />
                                                        ) : (
                                                            <></>
                                                        )
                                                    )
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        }
                    </Content>
                    {/* <Footer style={{ textAlign: "center" }}>
                        <p>Ant Design ©{new Date().getFullYear()} Created by Ant UED</p>
                    </Footer> */}
                </Layout>
            </Layout>
        </>
    );
};

export default LayoutUI;