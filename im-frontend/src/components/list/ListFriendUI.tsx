import { Skeleton, Divider, List, Avatar, Button, Tabs } from "antd";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { BACKEND_URL } from "../../constants/string";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

interface UserData {
    username: string;
    nickname: string;
    avatar: string;
    tag: string;
}

const ListFriendUI = () => {
    const token = useSelector((state: RootState) => state.auth.token);
    const authFriends = useSelector((state: RootState) => state.auth.friends);
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<UserData[]>([]);
    const [tagList, setTagList] = useState<string[]>([]);

    const loadMoreUserData = () => {
        if (loading) {
            return;
        }
        setLoading(true);
        fetch(`${BACKEND_URL}/api/list/friend`, {
            method: "GET",
            headers: {
                Authorization: token,
            },
        })
        .then((res) => res.json())
        .then((body) => {
            const userList: UserData[] = body.userList;
            setUserData(userList);
            const uniqueUserTagList = new Set(userList.map((user: { tag: string; }) => user.tag));
            const uniqueTags = Array.from(uniqueUserTagList);
            setTagList(uniqueTags);
            setLoading(false);
        })
        .catch(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        loadMoreUserData();
    }, [authFriends]);

    const switch2user = (username: string) => {
        router.push(`/user?username=${username}`);
    };

    return (
        <>
            <h2>好友</h2>
            <div style={{ display: "flex", justifyContent: "center"}}>
                <Tabs
                    defaultActiveKey="all"
                    style={{ height: 220, width: "80%" }}
                    tabPosition="top"
                >
                    {/* 添加一个标签页用于显示所有用户 */}
                    <Tabs.TabPane key="all" tab="All Users">
                        <div id={`tab-content-all`} style={{ height: 400, overflow: "auto" }}>
                            <InfiniteScroll
                                dataLength={userData.length}
                                next={loadMoreUserData}
                                hasMore={false}
                                scrollableTarget={`tab-content-all`}
                                loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
                                endMessage={<Divider plain>已经到底啦~🤐</Divider>}
                            >
                                <List
                                    dataSource={userData}
                                    renderItem={(item) => (
                                        <List.Item key={item.username}>
                                            <List.Item.Meta
                                                avatar={<Avatar src={item.avatar} />}
                                                title={<a onClick={() => switch2user(item.username)}>{item.nickname}</a>}
                                                description={item.username}
                                            />
                                            <Button type="primary" onClick={() => switch2user(item.username)}>个人信息</Button>
                                        </List.Item>
                                    )}
                                />
                            </InfiniteScroll>
                        </div>
                    </Tabs.TabPane>
                    {/* 显示各个标签下的用户 */}
                    {tagList.map((tag, index) => (
                        <Tabs.TabPane key={index} tab={tag}>
                            <div id={`tab-content-${index}`} style={{ height: 400, overflow: "auto" }}>
                                <InfiniteScroll
                                    dataLength={userData.length}
                                    next={loadMoreUserData}
                                    hasMore={false}
                                    scrollableTarget={`tab-content-${index}`}
                                    loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
                                    endMessage={<Divider plain>已经到底啦~🤐</Divider>}
                                >
                                    <List
                                        dataSource={userData.filter(user => user.tag === tag)}
                                        renderItem={(item) => (
                                            <List.Item key={item.username}>
                                                <List.Item.Meta
                                                    avatar={<Avatar src={item.avatar} />}
                                                    title={<a href="https://ant.design">{item.nickname}</a>}
                                                    description={item.username}
                                                />
                                                <Button type="primary" onClick={() => switch2user(item.username)}>个人信息</Button>
                                            </List.Item>
                                        )}
                                    />
                                </InfiniteScroll>
                            </div>
                        </Tabs.TabPane>
                    ))}
                </Tabs>
            </div>
        </>
    );
};

export default ListFriendUI;
