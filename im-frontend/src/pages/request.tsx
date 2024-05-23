import { RootState } from "../redux/store";
import { useSelector } from "react-redux";
import LayoutUI from "../components/LayoutUI";

const RequestScreen = () => {
    const username = useSelector((state: RootState) => state.auth.name);
    return (
        <LayoutUI username={username} typeOfProfile="request" />
    );
};

export default RequestScreen;