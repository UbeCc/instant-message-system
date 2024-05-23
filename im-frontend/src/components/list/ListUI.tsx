import { Tabs } from "antd";
import { useState } from "react";
import { UserOutlined, TeamOutlined } from "@ant-design/icons";
import ListFriendUI from "./ListFriendUI";
import ListGroupUI from "./ListGroupUI";

const { TabPane } = Tabs;

const ListUI = () => {
    const [currentTab, setCurrentTab] = useState("user");

    const handleTabChange = (key: string) => {
        setCurrentTab(key);
    };

    return (
        <>
            <h1>列表</h1>
            <Tabs defaultActiveKey="user" centered onChange={handleTabChange}>
                <TabPane tab="好友列表" key="user" icon={<UserOutlined />} />
                <TabPane tab="群聊列表" key="group" icon={<TeamOutlined />} />
            </Tabs>
            {
                currentTab === "user" ? <ListFriendUI /> : <ListGroupUI />
            }
        </>
    );
};

export default ListUI;