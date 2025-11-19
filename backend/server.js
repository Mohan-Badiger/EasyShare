import express from "express";
import http from "http";
import { Server } from "socket.io";
import corsOptions from "./config/cors.js";
import { sessionRoute } from "./routes/sessionRoute.js";
import { fileHandler } from "./sockets/fileHandler.js";

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(corsOptions);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket connection
io.on("connection", (socket) => {
  console.log("Client Connected:", socket.id);
  fileHandler(io, socket);
});

// Routes
app.use("/api/session", sessionRoute);


// Start Server
const PORT = 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
