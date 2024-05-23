interface RequestData {
    requestID: string,
    username: string,
    groupID: string,
    sender: string,
    type: string,
    reason: string,
    status: string,
}

interface Friendship {
    sender: string,      // 好友关系发起者
    receiver: string,    // 好友关系接收者
    create_time: Date,   // 好友关系创建时间
}

interface FriendshipData {
    sender: string,
    receiver: string,
}

interface FriendData {
    friendshipID: string,
    cursor: Date,
    friendCursor: Date,
    username: string,
    nickname: string,
}

interface FriendDataFromBackend {
    username: string,
    nickname: string,
    avatar: string,
}

interface UserData {
    username: string,
    messageCount: number,
    status: boolean,
    avatar: string
}

interface GroupData {
    groupID: string,
    groupname: string,
    userList: string[],
    userCursors: Date[],
    cursor: Date,
}

export { RequestData, Friendship, FriendshipData, FriendData, UserData, GroupData, FriendDataFromBackend };