import { RootState } from "../redux/store";
import { useSelector } from "react-redux";
import LayoutUI from "../components/LayoutUI";
import { useRouter } from "next/router";

const UserScreen = () => {
    const username = useSelector((state: RootState) => state.auth.name);
    const router = useRouter();
    const targetName = router.query.username as string;
    return <LayoutUI username={targetName} typeOfProfile={username === targetName ? "profile" : "user"} />;
};

export default UserScreen;