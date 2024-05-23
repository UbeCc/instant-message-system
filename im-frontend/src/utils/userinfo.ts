import { BACKEND_URL } from "../constants/string";
import { FAILURE_PREFIX } from "../constants/string";
import { FriendData, FriendDataFromBackend } from "../types/userinfo";

interface FriendRawData {
    code: number,
    message: string,
    friends: FriendDataFromBackend[],
}

interface GroupData {
    groupName: string,
    users: string[],
    avatar: string
}

const fetchFriends = async (token: string): Promise<FriendData[] | undefined> => {
    try {
        console.log("Fetching friends");
        const rawFriendsData = await fetch(`${BACKEND_URL}/api/user/friends`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${token}`,
            },
        });
        const data = await rawFriendsData.json();
        return data.friends;
    } catch (err) {
        alert(FAILURE_PREFIX + err);
        return undefined;
    }
};

const fetchGroups = async (token: string): Promise<GroupData[] | undefined> => {
    try {
        const rawGroupsData = await fetch(`${BACKEND_URL}/api/user/groups`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${token}`,
            },
        });
        const data = await rawGroupsData.json();
        return data.groups;
    } catch (err) {
        alert(FAILURE_PREFIX + err);
        return undefined;
    }
};

export { fetchFriends, fetchGroups };