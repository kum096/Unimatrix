import { io } from "socket.io-client";

export const socket = io(
  "http://192.168.252.111:3000",
  {
    transports: ["websocket"],
    autoConnect: false,
  }
);