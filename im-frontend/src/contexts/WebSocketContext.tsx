import { createContext } from "react";
import { Socket } from "socket.io-client";

const WebSocketContext = createContext<Socket | undefined>(undefined);

export default WebSocketContext;