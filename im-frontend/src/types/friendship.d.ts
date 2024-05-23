export interface Friendship {
    sender: string;      // 好友关系发起者
    receiver: string;    // 好友关系接收者
    create_time: Date;   // 好友关系创建时间
}

export interface FriendshipData {
    sender: string;
    receiver: string;
}

export interface FriendData {
    username: string,
    nickname: string,
    avatar: BinaryData
}