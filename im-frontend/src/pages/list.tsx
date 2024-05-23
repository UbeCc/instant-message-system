import { RootState } from "../redux/store";
import { useSelector } from "react-redux";
import LayoutUI from "../components/LayoutUI";

const ListScreen = () => {
    const username = useSelector((state: RootState) => state.auth.name);
    return (
        <LayoutUI username={username} typeOfProfile="list" />
    );
};

export default ListScreen;