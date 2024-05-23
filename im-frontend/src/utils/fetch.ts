import { BACKEND_URL } from "../constants/string";
import { FAILURE_PREFIX } from "../constants/string";
import { GET_FRIEND_FAILED } from "../constants/string";

const getFriends = async (token: string) => {
    try {
        const rawFriendsData = await fetch(`${BACKEND_URL}/api/list/friend`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${token}`,
            },
        });
        const friendsData = await rawFriendsData.json();
        return friendsData.userList ? friendsData.userList : [];
    } catch (err) {
        alert(FAILURE_PREFIX + err);
    }
};

const getGroups = async (token: string) => {
    try {
        const rawGroupsData = await fetch(`${BACKEND_URL}/api/list/group`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${token}`,
            },
        });
        const groupsData = await rawGroupsData.json();
        return groupsData.groups ? groupsData.groups : [];
    } catch (err) {
        alert(FAILURE_PREFIX + err);
    }
};

const getProfile = async (token: string, username: string) => {
    try {
        const rawProfileData = await fetch(`${BACKEND_URL}/api/user/${username}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${token}`,
            },
        });
        const profileData = await rawProfileData.json();
        return profileData.user ? profileData.user : {};
    } catch (err) {
        alert(FAILURE_PREFIX + err);
    }
};

const getRequests = async (token: string) => {
    try {
        const rawRequestsData = await fetch(`${BACKEND_URL}/api/list/request`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${token}`,
            },
        });
        const requestsData = await rawRequestsData.json();
        return requestsData.requests ? requestsData.requests : [];
    } catch (err) {
        alert(FAILURE_PREFIX + err);
    }
};

const checkIsFriend = async (token: string, username: string, friendname: string): Promise<string | undefined> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/check/friend`, {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                username: friendname,
            }),
        });
        const data = await response.json();
        if (Number(data.code) === 0) {
            const friendshipId: string = data.friendshipID;
            return friendshipId;
        } else {
            alert(GET_FRIEND_FAILED);
            return "";
        }
    } catch (error) {
        alert(FAILURE_PREFIX + error);
        return "";
    }
};

export { getFriends, getGroups, getRequests, getProfile, checkIsFriend };