import { createContext } from "react";

const LastUpdateTimeContext = createContext<Date | undefined>(new Date());

export default LastUpdateTimeContext;