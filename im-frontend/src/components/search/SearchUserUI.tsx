import { Skeleton, Divider, List, Avatar, Button } from "antd";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { BACKEND_URL } from "../../constants/string";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

interface UserData {
    username: string;
    avatar: string;
}

interface SearchUserUIProps {
    targetName: string;
}

const SearchUserUI = (props: SearchUserUIProps) => {
    const token = useSelector((state: RootState) => state.auth.token);
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<UserData[]>([]);

    const loadMoreUserData = () => {
        if (loading) {
            return;
        }
        setLoading(true);
        fetch(`${BACKEND_URL}/api/search/user`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                nickname: props.targetName,
            }),
        })
        .then((res) => {
            return res.json();
        })
        .then((body) => {
            const newUserList = body.userList.map((user: UserData) => ({
                username: user.username,
                avatar: user.avatar,
            }));
            setUserData(newUserList);
            setLoading(false);
        })
        .catch(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        loadMoreUserData();
    }, [props.targetName]);

    const switch2user = (username: string) => {
        router.push(`/user?username=${username}`);
    };

    return (
        <>
            <h2>用户</h2>
            <div id="scrollableDiv"
                style={{
                    height: 400,
                    overflow: "auto",
                    padding: "0 16px",
                    border: "1px solid rgba(140, 140, 140, 0.35)",
                }}
            >
                <InfiniteScroll
                    dataLength={userData.length}
                    next={loadMoreUserData}
                    hasMore={false}
                    loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
                    endMessage={<Divider plain>已经到底啦~🤐</Divider>}
                    scrollableTarget="scrollableDiv"
                >
                    <List
                        dataSource={userData}
                        renderItem={(item) => (
                            <List.Item key={item.username}>
                            <List.Item.Meta
                                avatar={<Avatar src={item.avatar} />}
                                title={<a onClick={() => switch2user(item.username)}>{props.targetName}</a>}
                                description={"用户名称：" + item.username}
                            />
                            <Button type="primary" onClick={() => switch2user(item.username)}>个人信息</Button>
                            </List.Item>
                        )}
                    />
                </InfiniteScroll>
            </div>
        </>
    );
};

export default SearchUserUI;