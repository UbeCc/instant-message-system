import { Skeleton, Divider, List, Button, Avatar } from "antd";
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

interface GroupData {
    groupID: string;
    users: UserData[];
    avatar: string;
}

interface SearchGroupUIProps {
    targetName: string;
}

const SearchGroupUI = (props: SearchGroupUIProps) => {
    const token = useSelector((state: RootState) => state.auth.token);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [groupData, setGroupData] = useState<GroupData[]>([]);

    const loadMoreGroupData = () => {
        if (loading) {
            return;
        }
        setLoading(true);
        fetch(`${BACKEND_URL}/api/search/group`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                groupname: props.targetName,
            }),
        })
        .then((res) => res.json())
        .then((body) => {
            setGroupData(body.groupList);
            setLoading(false);
        })
        .catch(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        loadMoreGroupData();
    }, [props.targetName]);

    const switch2group = (groupID: string) => {
        router.push(`/group?groupID=${groupID}`);
    };

    return (
        <>
            <h2>群聊</h2>
            <div id="scrollableDiv"
                style={{
                    height: 400,
                    overflow: "auto",
                    padding: "0 16px",
                    border: "1px solid rgba(140, 140, 140, 0.35)",
                }}
            >
                <InfiniteScroll
                    dataLength={groupData.length}
                    next={loadMoreGroupData}
                    hasMore={false}
                    loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
                    endMessage={<Divider plain>已经到底啦~🤐</Divider>}
                    scrollableTarget="scrollableDiv"
                >
                    <List
                        dataSource={groupData}
                        renderItem={(item) => (
                            <List.Item key={item.groupID}>
                                <List.Item.Meta
                                    avatar={<Avatar src={item.avatar} />}
                                    title={<a onClick={() => switch2group(item.groupID)}>{props.targetName}</a>}
                                    description={"群聊 ID：" + item.groupID}
                                />
                                <Button type="primary" onClick={() => switch2group(item.groupID)}>群聊信息</Button>
                            </List.Item>
                        )}
                    />
                </InfiniteScroll>
            </div>
        </>
    );
};

export default SearchGroupUI;