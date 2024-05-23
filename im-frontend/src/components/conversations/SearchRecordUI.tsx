import { Skeleton, Divider, List, Avatar } from "antd";
import { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { BACKEND_URL, FAILURE_PREFIX, FETCH_RECORD_FAILED, GET_PROFILE_FAILED } from "../../constants/string";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

interface RecordData {
    createTime: string;
    content: string;
    sender: string;
    _id: string;
    avatar: string;
}

interface SearchRecordUIProps {
    content: string;
    startTime: string;
    finishTime: string;
    toggle: boolean;
    sender: string;
    convID: string;
}

const SearchRecordUI = (props: SearchRecordUIProps) => {
    const username = useSelector((state: RootState) => state.auth.name);
    const token = useSelector((state:RootState) => state.auth.token);
    const [userDataMap, setUserDataMap] = useState<Map<string, string>>(new Map<string, string>()); // Map<username, avatar
    const [recordData, setRecordData] = useState<RecordData[]>([]);
    const [fullRecordData, setFullRecordData] = useState<RecordData[]>([]);
    const [senderRecordData, setSenderRecordData] = useState<RecordData[]>([]);
    const [timeRecordData, setTimeRecordData] = useState<RecordData[]>([]);
    const [contentRecordData, setContentRecordData] = useState<RecordData[]>([]);

    const fetchUserData = async (name: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/user/${name}`, {
                method: "GET",
                headers: {
                    Authorization: token,
                },
            });
            const data = await response.json();
            if (Number(data.code) === 0) {
                setUserDataMap((prev) => new Map(prev.set(name, data.user.avatar)));
            } else {
                alert(GET_PROFILE_FAILED);
            }
        } catch (error) {
            alert(FAILURE_PREFIX + error);
        }
    };

    const loadMoreRecordData = () => {
        console.log("PROPS", props);
        fetch(`${BACKEND_URL}/api/message`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                username,
                convID: props.convID,
            }),
        })
        .then((res) => res.json())
        .then((body) => {
            console.log("FULL");
            setFullRecordData(body.msgList);
        })
        .catch(() => {
            alert(FETCH_RECORD_FAILED);
        });

        if (props.sender.length !== 0) {
            fetch(`${BACKEND_URL}/api/message/sender`, {
                method: "POST",
                headers: {
                    Authorization: token,
                },
                body: JSON.stringify({
                    username,
                    sender: props.sender,
                    convID: props.convID,
                }),
            })
            .then((res) => res.json())
            .then((body) => {
                console.log("BODY SENDER", body);
                setSenderRecordData(body.msgList);
            })
            .catch(() => {
                alert(FETCH_RECORD_FAILED);
            });
        }

        if (props.content.length !== 0) {
            fetch(`${BACKEND_URL}/api/message/content`, {
                method: "POST",
                headers: {
                    Authorization: token,
                },
                body: JSON.stringify({
                    username,
                    content: props.content,
                    convID: props.convID,
                }),
            })
            .then((res) => res.json())
            .then((body) => {
                console.log("BODY CONTENT", body);
                setContentRecordData(body.msgList);
            })
            .catch(() => {
                alert(FETCH_RECORD_FAILED);
            });
        }

        if (props.startTime.length !== 0 && props.finishTime.length !== 0) {
            console.log("START", props.startTime);
            console.log("FINISH", props.finishTime);
            fetch(`${BACKEND_URL}/api/message/time`, {
                method: "POST",
                headers: {
                    Authorization: token,
                },
                body: JSON.stringify({
                    username,
                    startTime: props.startTime,
                    finishTime: props.finishTime,
                    convID: props.convID,
                }),
            })
            .then((res) => res.json())
            .then((body) => {
                console.log("BODY TIME", body);
                setTimeRecordData(body.msgList);
            })
            .catch(() => {
                alert(FETCH_RECORD_FAILED);
            });
        }
    };

    const filterRecordData = () => {
        let filteredData = fullRecordData;
        if (props.sender.length !== 0) {
            filteredData = filteredData.filter((item) => senderRecordData.some((newItem) => newItem._id === item._id));
        }
        if (props.content.length !== 0) {
            filteredData = filteredData.filter((item) => contentRecordData.some((newItem) => newItem._id === item._id));
        }
        if (props.startTime.length !== 0 && props.finishTime.length !== 0) {
            filteredData = filteredData.filter((item) => timeRecordData.some((newItem) => newItem._id === item._id));
        }
        setRecordData(filteredData);
    };

    useEffect(() => {
        filterRecordData();
    }, [fullRecordData, senderRecordData, timeRecordData, contentRecordData]);

    useEffect(() => {
        const requireUsersSet = new Set(fullRecordData.map((item) => item.sender));
        const requireUsers = Array.from(requireUsersSet); // 将 Set 转换为数组
        requireUsers.forEach((item) => {
            fetchUserData(item);
        });
    }, [fullRecordData]);

    useEffect(() => {
        loadMoreRecordData();
    }, [props.toggle]);

    const convertToLocaleTime = (time: string): string => {
        const date = new Date(time);
        const localTime = date.toLocaleString("zh-CN", {year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"});
        return localTime.replace("/", "年").replace("/", "月").replace(" ", "日 ");
    };

    return (
        <>
            <h2>聊天记录</h2>
            <div id="scrollableDiv"
                style={{
                    height: 400,
                    overflow: "auto",
                    padding: "0 16px",
                    border: "1px solid rgba(140, 140, 140, 0.35)",
                }}
            >
                <InfiniteScroll
                    dataLength={recordData.length}
                    next={loadMoreRecordData}
                    hasMore={false}
                    loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
                    endMessage={<Divider plain>已经到底啦~🤐</Divider>}
                    scrollableTarget="scrollableDiv"
                >
                    <List
                        dataSource={recordData}
                        renderItem={(item) => (
                            <List.Item key={item._id}>
                                <List.Item.Meta
                                    avatar={<Avatar src={userDataMap.get(item.sender)} />}
                                    title={item.content}
                                    description={`${item.sender} 于 ${convertToLocaleTime(item.createTime.toString())} 时曾说`}
                                />
                            </List.Item>
                        )}
                    />
                </InfiniteScroll>
            </div>
        </>
    );
};

export default SearchRecordUI;