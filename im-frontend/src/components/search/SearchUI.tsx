import { useState } from "react";
import { Tabs, Input } from "antd";
import { UserOutlined, TeamOutlined } from "@ant-design/icons";
import SearchUserUI from "./SearchUserUI";
import SearchGroupUI from "./SearchGroupUI";

const { Search } = Input;
const { TabPane } = Tabs;

const SearchUI = () => {
    const [currentTab, setCurrentTab] = useState("user");
    const [searchContent, setSearchContent] = useState("");

    const onSearch = (value: string) => {
        setSearchContent(value);
    };

    const handleTabChange = (key: string) => {
        setCurrentTab(key);
        setSearchContent("");
    };

    return (
        <>
            <h1>搜索用户/群聊</h1>
            <Tabs defaultActiveKey="user" centered onChange={handleTabChange}>
                <TabPane tab="搜索用户" key="user" icon={<UserOutlined />}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <Search placeholder="查找用户名称" allowClear onSearch={onSearch} style={{ width: 500 }} />
                    </div>
                </TabPane>
                <TabPane tab="搜索群聊" key="group" icon={<TeamOutlined />}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <Search placeholder="查找群聊名称" allowClear onSearch={onSearch} style={{ width: 500 }} />
                    </div>
                </TabPane>
            </Tabs>
            {
                currentTab === "user" ? <SearchUserUI targetName={searchContent} /> :
                <SearchGroupUI targetName={searchContent} />
            }
        </>
    );
};

export default SearchUI;