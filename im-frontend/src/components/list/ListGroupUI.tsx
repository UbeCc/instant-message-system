import { Skeleton, Divider, List, Button, Space, Modal, Checkbox, Avatar } from "antd";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { BACKEND_URL, FAILURE_PREFIX } from "../../constants/string";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { PlusOutlined } from "@ant-design/icons";

interface UserData {
    username: string;
    nickname: string;
    avatar: string;
}

interface GroupData {
    groupID: string;
    groupname: string;
    userList: UserData[];
    avatar: string;
}

const ListGroupUI = () => {
    const authGroups = useSelector((state: RootState) => state.auth.groups);
    const token = useSelector((state:RootState) => state.auth.token);
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [groupData, setGroupData] = useState<GroupData[]>([]);

    const loadMoreGroupData = () => {
        if (loading) {
            return;
        }
        setLoading(true);
        fetch(`${BACKEND_URL}/api/list/group`, {
            method: "GET",
            headers: {
                Authorization: token,
            },
        })
        .then((res) => res.json())
        .then((body) => {
            console.log(body.groups, "GROUPBODY");
            setGroupData(body.groups);
            setLoading(false);
        })
        .catch((e) => {
            console.log(e);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadMoreGroupData();
    }, [authGroups]);

    const switch2group = (groupID: string) => {
        router.push(`/group?groupID=${groupID}`);
    };

    const [userData, setUserData] = useState<UserData[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const handleCheckboxChange = (selectedValues: string[]) => {
        setSelectedUsers(selectedValues);
    };

    const getFriends = () => {
        fetch(`${BACKEND_URL}/api/list/friend`, {
            method: "GET",
            headers: {
                Authorization: token,
            },
        })
        .then((res) => res.json())
        .then((body) => {
            setUserData(body.userList);
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const [isModalOpen, setIsModalOpen] = useState(false);

    const showModal = () => {
        getFriends();
        setIsModalOpen(true);
    };

    const handleOk = () => {
        setIsModalOpen(false);
        fetch(`${BACKEND_URL}/api/group/create`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                usernameList: [...selectedUsers],
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert("Group created successfully!");
            } else {
                alert("Group creation failed!");
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    return (
        <>
            <div style={{ display: "flex", alignItems: "center" }}>
                <h2>群聊</h2>
                <Space style={{ marginLeft: "10px"}}>
                    <Button onClick={showModal} style={{ marginLeft: "auto" }} icon={<PlusOutlined />}>创建群聊</Button>
                </Space>
            </div>
            <Modal title="选择好友" open={isModalOpen} onOk={handleOk} onCancel={() => setIsModalOpen(false)}>
                <Checkbox.Group options={userData.map(user => user.username)}
                    onChange={handleCheckboxChange}
                    value={selectedUsers}
                />
            </Modal>
            <div id="scrollableDiv"
                style={{
                    height: 400,
                    overflow: "auto",
                    padding: "0 16px",
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
                                    title={<a onClick={() => switch2group(item.groupID)}>{item.groupname}</a>}
                                    description={`群聊 ID: ${item.groupID}`}
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

export default ListGroupUI;