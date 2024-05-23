import LayoutUI from "../components/LayoutUI";
import { useRouter } from "next/router";

const GroupScreen = () => {
    const router = useRouter();
    return (
        <LayoutUI username={router.query.groupID as string} typeOfProfile="group" />
    );
};

export default GroupScreen;