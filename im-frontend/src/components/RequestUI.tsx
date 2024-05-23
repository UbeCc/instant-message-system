import { Skeleton, Divider, List, Button, Space } from "antd";
import { useState, useEffect } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useSelector, useDispatch } from "react-redux";
import { BACKEND_URL, FAILURE_PREFIX } from "../constants/string";
import { RootState } from "../redux/store";
import { RequestData } from "../types/userinfo";
import { setFriends, setRequests } from "../redux/auth";
import { useRouter } from "next/router";

const RequestUI = () => {
    const dispatch = useDispatch();
    const token = useSelector((state:RootState) => state.auth.token);
    const authRequests = useSelector((state:RootState) => state.auth.requests);
    const [requestList, setRequestList] = useState<RequestData[]>([]);
    const username = useSelector((state:RootState) => state.auth.name);
    const authFriends = useSelector((state:RootState) => state.auth.friends);
    const router = useRouter();

    useEffect(() => {
        let requests;
        try {
            requests = JSON.parse(authRequests);
            if(!requests) {
                requests = [];
            }
        } catch (err) {
            requests = [];
        }
        requests = requests.filter((request: RequestData) => request !== null);
        setRequestList(requests);
    }, [authRequests]);

    const [loading, setLoading] = useState(false);

    const loadMoreRequestData = () => {
        if (loading) {
            return;
        }
        setLoading(true);
        fetch(`${BACKEND_URL}/api/list/request`, {
            method: "GET",
            headers: {
                Authorization: token,
            },
        })
        .then((res) => res.json())
        .then((body) => {
            // 按照 createTime 排序
            body.requests.sort(
                (a: { createTime: string | number | Date; }, b: { createTime: string | number | Date; }) =>
                    new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
            );
            dispatch(setRequests(body.requests));
            setLoading(false);
        })
        .catch(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        loadMoreRequestData();
    }, [authRequests]);

    const accept = (request: RequestData) => {
        fetch(`${BACKEND_URL}/api/request/accept`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                requestID: request.requestID,
                username: request.username,
                groupID: request.groupID,
                sender: request.sender,
                type: request.type,
            }),
        })
        .then((res) => res.json())
        .then(async (res) => {
            if (Number(res.code) === 0) {
                dispatch(setFriends([JSON.parse(authFriends), request.username]));
                alert("Friend request accepted successfully!");
                router.push("/request");
            } else {
                alert("Friend request acceptance failed!");
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const reject = (request: RequestData) => {
        fetch(`${BACKEND_URL}/api/request/reject`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                requestID: request.requestID,
                username: request.username,
                groupID: request.groupID,
                sender: request.sender,
                type: request.type,
                reason: "My answer is no.",
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert("Friend request rejected successfully!");
            } else {
                alert("Friend request rejection failed!");
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    return (
        <>
            <h1>好友/群聊审批</h1>
            <div id="scrollableDiv"
                style={{
                    height: 580,
                    overflow: "auto",
                    padding: "0 16px",
                    border: "1px solid rgba(140, 140, 140, 0.35)",
                }}
            >
                <InfiniteScroll
                    dataLength={requestList.length}
                    next={loadMoreRequestData}
                    hasMore={false}
                    loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
                    endMessage={<Divider plain>已经到底啦~🤐</Divider>}
                    scrollableTarget="scrollableDiv"
                >
                    <List
                        dataSource={requestList}
                        renderItem={(item) => (
                            <List.Item key={item.requestID}>
                            {
                                item.sender === username ? <>
                                    <List.Item.Meta
                                        title={"你申请" + (
                                            (item.type === "friend") ? ("添加 " + item.username + " 为好友") : ("加入群聊 " + item.groupID)
                                        )}
                                        description={"申请理由：" + item.reason}
                                    />
                                    {
                                        (item.status === "pending") ? (
                                            <Button type="primary" disabled={true}>正在处理中</Button>
                                        ) : (
                                            <Space>
                                                {
                                                    item.status === "accepted" ? (
                                                        <Button type="dashed" >已被同意</Button>
                                                    ) : (
                                                        <Button type="dashed" danger >已被拒绝</Button>
                                                    )
                                                }
                                                <div></div>
                                            </Space>
                                        )
                                    }
                                </> : <>
                                    <List.Item.Meta
                                        title={item.sender + " 申请" + (
                                            (item.type === "friend") ? "添加你为好友" : ("加入群聊 " + item.groupID)
                                        )}
                                        description={"申请理由：" + item.reason}
                                    />
                                    {
                                        (item.status === "pending") ? (
                                            <Space>
                                                <Button type="primary" onClick={() => accept(item)}>同意</Button>
                                                <Button type="primary" danger onClick={() => reject(item)}>拒绝</Button>
                                            </Space>
                                        ) : (
                                            <Space>
                                                {
                                                    item.status === "accepted" ? (
                                                        <Button type="dashed" >已同意</Button>
                                                    ) : (
                                                        <Button type="dashed" danger >已拒绝</Button>
                                                    )
                                                }
                                                <div></div>
                                            </Space>
                                        )
                                    }
                                </>
                            }
                            </List.Item>
                        )}
                    />
                </InfiniteScroll>
            </div>
        </>
    );
};

export default RequestUI;