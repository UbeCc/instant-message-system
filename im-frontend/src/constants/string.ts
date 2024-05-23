/**
 * @note 本文件是一个字符串常量文件的示例，较长的常量字符串，如各类提示文字，均可以写在这里
 *       这么做可以提高核心代码可读性，不会因为过长的字符串导致主逻辑代码难以分析
 */
export const BACKEND_URL = process.env.NODE_ENV === "production" ? "https://im-backend-GitLabRepo.app.secoder.net" : "http://localhost:80";

export const CREATE_SUCCESS = "成功创建一个游戏记录";
export const UPDATE_SUCCESS = "成功更新该游戏记录";
export const DELETE_SUCCESS = "成功删除该游戏记录";

export const FAILURE_PREFIX = "网络请求失败：";

export const LOGIN_REQUIRED = "你需要登录才能完成这一操作";
export const LOGIN_SUCCESS_PREFIX = "登录成功，用户名：";
export const LOGIN_FAILED = "登录失败";

export const REGISTER_SUCCESS_PREFIX = "注册成功，用户名：";
export const REGISTER_FAILED = "注册失败";

export const REMOVE_SUCCESS_PREFIX = "注销成功，用户名：";
export const REMOVE_FAILED = "注销失败";

export const EDIT_SUCCESS_PREFIX = "修改个人信息成功，用户名：";
export const EDIT_FAILED = "修改个人信息失败";

export const EDIT_GROUP_SUCCESS = "修改群信息成功";
export const EDIT_GROUP_FAILED = "修改群信息失败";


export const DELETE_MESSAGE_SUCCESS = "删除消息成功";
export const DELETE_MESSAGE_FAILED = "删除消息失败";
export const FETCH_RECORD_FAILED = "获取消息记录失败";

export const GET_SUCCESS_PREFIX = "获取用户信息成功，用户名：";
export const GET_PROFILE_FAILED = "获取用户信息失败";
export const GET_FRIEND_FAILED = "判断好友关系失败";

export const GET_GROUP_PROFILE_FAILED = "获取群信息失败";

export const USER_DEACTIVATED = "用户已被禁用";

export const AVATAR_EXAMPLE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAKCAYAAABmBXS+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAAVSURBVChTY3gro/KfEB5VRDVFKv8BQIfDeY84tLcAAAAASUVORK5CYII=";

