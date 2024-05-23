import { useState, useEffect } from "react";
import { AVATAR_EXAMPLE, BACKEND_URL, FAILURE_PREFIX, GET_PROFILE_FAILED, EDIT_FAILED, EDIT_SUCCESS_PREFIX, GET_GROUP_PROFILE_FAILED, EDIT_GROUP_FAILED, EDIT_GROUP_SUCCESS } from "../../constants/string";
import { setRequests } from "../../redux/auth";
import { RootState } from "../../redux/store";
import { useSelector, useDispatch } from "react-redux";
import { Card, List, Avatar, Button, Select, Space, Modal, Checkbox } from "antd";
import { LoadingOutlined, PlusOutlined, RollbackOutlined } from "@ant-design/icons";
import { message, Upload, Form, Input, } from "antd";
import type { GetProp, UploadProps } from "antd";
import { useRouter } from "next/router";
import { UserOutlined } from "@ant-design/icons";

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
    targetGroupname: string;
}

interface GroupData {
    groupID: string;
    groupname: string;
    master: string;
    admins: string[];
    memberList: string[];
    avatar: string;
    createTime: Date;
    announcement: string;
    invite_check: boolean;
}

interface UserData {
    username: string;
    nickname: string;
    avatar: string;
}

const GroupProfileUI = (props: ProfileProps) => {
    const dispatch = useDispatch();
    const username = useSelector((state: RootState) => state.auth.name);
    const token = useSelector((state:RootState) => state.auth.token);
    const authRequest = useSelector((state:RootState) => state.auth.requests);
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState<string>(AVATAR_EXAMPLE);

    const [groupData, setGroupData] = useState<GroupData>({
        groupID: "",
        groupname: "",
        master: "",
        admins: [],
        memberList: [],
        avatar: "",
        createTime: new Date(),
        announcement: "",
        invite_check: false,
    });

    const [groupMaster, setGroupMaster] = useState<string>("");
    const [groupAdmins, setGroupAdmins] = useState<string[]>([]);
    const [groupMemberList, setGroupMemberList] = useState<string[]>([]);

    useEffect(() => {
        // 发起异步请求获取用户信息
        const fetchGroupData = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/group/${props.targetGroupname}`, {
                    method: "GET",
                    headers: {
                        Authorization: token,
                    },
                });
                const data = await response.json();
                if (Number(data.code) === 0) {
                    setGroupData(data.group);
                    setAvatar(data.group.avatar);
                    setGroupMaster(data.group.master);
                    setGroupAdmins(data.group.admins);
                    setGroupMemberList(data.group.memberList);
                } else {
                    alert(GET_GROUP_PROFILE_FAILED);
                }
            } catch (error) {
                alert(FAILURE_PREFIX + error);
            }
        };
        // 调用异步函数
        if (props.targetGroupname !== undefined)
            fetchGroupData();
    }, [props.targetGroupname]);

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

    function areArraysEqual(arr1: string[], arr2: string[]) {
        const set2 = new Set(arr2);
        if (arr1.length !== set2.size) {
            return false;
        }
        for (const item of arr1) {
            if (!set2.has(item)) {
                return false;
            }
        }
        return true;
    }

    const edit = () => {
        fetch(`${BACKEND_URL}/api/group/edit`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                groupID: groupData.groupID,
                groupname: groupData.groupname,
                avatar,
                invite_check: groupData.invite_check,
                announcement: groupData.announcement,
                admins: areArraysEqual(groupData.admins.filter((item) => item !== groupData.master), groupAdmins) ? undefined : groupData.admins.filter((item) => item !== groupData.master),
                master: groupData.master === groupMaster ? undefined : groupData.master,
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert(EDIT_GROUP_SUCCESS);
                router.push(`/group?groupID=${groupData.groupID}`);
            } else {
                alert(EDIT_GROUP_FAILED);
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const request = (name: string) => {
        console.log("I REQUEST");
        fetch(`${BACKEND_URL}/api/request/send`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                groupID: groupData.groupID,
                receiver: "",
                sender: name,
                type: "group",
                reason: name + ` wants to join the group ${groupData.groupID}(invited by ${username}).`,
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                const requestID: string = res.requestID;
                const parsedRequest: string[] = JSON.parse(authRequest);
                dispatch(setRequests([requestID, ...parsedRequest]));
                alert("Group request sent successfully!");
            } else {
                alert("Group request failed!");
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const remove = (name: string) => {
        fetch(`${BACKEND_URL}/api/remove/group/member`, {
            method: "DELETE",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                groupID: groupData.groupID,
                memberName: name,
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert("Group member removed successfully!");
            } else {
                alert("Group member removed failed!");
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
    };

    const convertToLocaleTime = (time: string): string => {
        const date = new Date(time);
        const localTime = date.toLocaleString("zh-CN", {year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"});
        return localTime.replace("/", "年").replace("/", "月").replace(" ", "日 ");
    };

    const addAdmin = (name: string) => {
        if (groupData.admins.includes(name)) {
            return;
        }
        setGroupData({...groupData, admins: [...groupData.admins, name]});
        console.log(groupData.admins);
    };

    const removeAdmin = (name: string) => {
        setGroupData({...groupData, admins: groupData.admins.filter((item) => item !== name)});
        console.log(groupData.admins);
    };

    const removeMember = (name: string) => {
        setGroupData({...groupData, memberList: groupData.memberList.filter((item) => item !== name)});
        if (groupData.admins.includes(name)) {
            setGroupData({...groupData, admins: groupData.admins.filter((item) => item !== name)});
        }
        if (groupData.master === name) {
            alert("请重新指定转让群主！");
            setGroupData({...groupData, master: groupMaster});
        }
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
        selectedUsers.forEach((selectedUser) => {
            if (!groupData.memberList.includes(selectedUser)) {
                request(selectedUser);
            }
        });
    };

    const modify = () => {
        edit();
        const removedMembers = groupMemberList.filter((member) => !groupData.memberList.includes(member));
        removedMembers.forEach((member) => {
            remove(member);
        });
    };

    const exitGroup = () => {
        if (groupMaster === username) {
            alert("群主无法退出群聊！请先转让群主！");
            return;
        }
        fetch(`${BACKEND_URL}/api/remove/group`, {
            method: "DELETE",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                groupID: groupData.groupID,
            }),
        })
        .then((res) => res.json())
        .then((res) => {
            if (Number(res.code) === 0) {
                alert("Self removed successfully!");
            } else {
                alert("Self removed failed!");
            }
        })
        .catch((err) => alert(FAILURE_PREFIX + err));
        router.push("/");
    };

    return (
        <>
            <h1>群聊信息</h1>
            <h2>基本信息</h2>
            <Form
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 14 }}
                layout="horizontal"
                style={{ maxWidth: 600 }}
                disabled={groupMaster !== username && !groupAdmins.includes(username)}
            >
                <Form.Item label="群聊名称">
                    <Input value={groupData.groupname} onChange={(e) => setGroupData({...groupData, groupname: e.target.value})} />
                </Form.Item>
                <Form.Item label="群聊ID">
                    <Input value={groupData.groupID} disabled={true}/>
                </Form.Item>
                <Form.Item label="群主">
                    <Select
                        showSearch
                        optionFilterProp="children"
                        defaultValue={groupMaster}
                        filterOption={(input, option) => (option?.label ?? "").includes(input)}
                        filterSort={(optionA, optionB) =>
                            (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
                        }
                        options={[...groupData.memberList.map((member) => ({ label: member, value: member })),]}
                        onChange={(e) => setGroupData({...groupData, master: e })}
                        value={groupData.master}
                        disabled={groupMaster !== username}
                    />
                </Form.Item>
                <Card
                    title={"群成员"}
                    extra={
                        <>
                            <Space style={{ marginLeft: "10px"}}>
                                <Button onClick={() => {
                                    setGroupData({...groupData, admins: groupAdmins, memberList: groupMemberList});
                                }}><RollbackOutlined />重置修改</Button>
                                <Button onClick={showModal} disabled={groupData.memberList.indexOf(username) === -1} style={{ marginLeft: "auto" }} icon={<PlusOutlined />}>邀请好友入群</Button>
                            </Space>
                            <Modal title="选择还未入群的好友" open={isModalOpen} onOk={handleOk} onCancel={() => setIsModalOpen(false)}>
                                <Checkbox.Group disabled={false} options={userData.map(user => user.username).filter(user => !groupMemberList.includes(user))}
                                    onChange={handleCheckboxChange}
                                    value={selectedUsers}
                                />
                            </Modal>
                        </>
                    }
                    style={{ margin: "16px auto", maxWidth: 800 }}
                >
                    <List
                        itemLayout="horizontal"
                        dataSource={groupData.memberList}
                        renderItem={(item) => (
                            <List.Item>
                                <List.Item.Meta
                                    avatar={<Avatar icon={<UserOutlined />} />}
                                    title={<a onClick={() => router.push(`/user?username=${item}`)}>{item}</a>}
                                    description={groupMaster === item ? "群主" : (groupData.admins.includes(item) ? "管理员" : "成员")}
                                />
                                <Space>
                                    {
                                        groupMaster === username &&
                                        (groupData.admins.includes(item) ? <Button type="dashed" onClick={() => removeAdmin(item)}>移除管理员</Button> :
                                        (groupMaster !== item ? <Button type="dashed" onClick={() => addAdmin(item)}>设为管理员</Button> : <></>))
                                    }
                                    {
                                        item !== username && (groupMaster === username || (groupData.admins.includes(username) && item !== groupMaster))
                                        ? <Button type="dashed" danger onClick={() => removeMember(item)}>移除成员</Button>
                                        : <></>
                                    }
                                </Space>
                            </List.Item>
                        )}
                    />
                </Card>
                <Card
                    title={"群公告"}
                    extra={<span>{`群创建时间：${convertToLocaleTime(groupData.createTime.toString())}`}</span>}
                    style={{ margin: "16px auto", maxWidth: 800 }}
                >
                    <Input.TextArea allowClear showCount onChange={(e) => setGroupData({...groupData, announcement: e.target.value})} value={groupData.announcement} />
                </Card>
                <Form.Item label="是否仅能通过邀请进群">
                    <Select value={groupData.invite_check ? "true" : "false"} onChange={(e) => setGroupData({...groupData, invite_check: e === "true" })}>
                        <Select.Option value="true">是</Select.Option>
                        <Select.Option value="false">否</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item label="群头像">
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
                <Form.Item>
                    <Space>
                        {
                            groupMaster === username || groupAdmins.includes(username) ?
                            <Button type="primary" onClick={modify}>修改群信息</Button> :
                            ((groupData.memberList && groupData.memberList.includes(username) || groupData.invite_check) ?
                            <></> : <Button type="primary" onClick={() => request(username)} disabled={false}>申请加入</Button>)
                        }
                        {
                            groupMemberList.includes(username) ?
                            <Button type="primary" danger disabled={false} onClick={exitGroup}>退出群聊</Button> : <></>
                        }
                    </Space>
                </Form.Item>
            </Form>
        </>
    );
};

export default GroupProfileUI;