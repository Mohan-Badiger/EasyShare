import { sessions } from "../routes/sessionRoute.js";

export const fileHandler = (io, socket) => {
    
  socket.on("register-sender", ({ sessionId }) => {
    if (!sessions[sessionId]) return;

    sessions[sessionId].senderSocketId = socket.id;
    socket.join(sessionId);
    console.log("Sender registered:", sessionId);
  });

  socket.on("register-receiver", ({ sessionId }) => {
    if (!sessions[sessionId]) return;

    sessions[sessionId].receiverSocketId = socket.id;
    socket.join(sessionId);

    const senderSocketId = sessions[sessionId].senderSocketId;
    if (senderSocketId) {
      io.to(senderSocketId).emit("receiver-connected", {});
    }
    console.log("Receiver registered:", sessionId);
  });

  // Stream file metadata
  socket.on("file-meta", (data) => {
    const { sessionId } = data;
    socket.to(sessionId).emit("file-meta", data);
  });

  // Stream chunk data
  socket.on("file-chunk", (data) => {
    const { sessionId } = data;
    socket.to(sessionId).emit("file-chunk", data);
  });

  // File transfer complete
  socket.on("file-complete", ({ sessionId }) => {
    socket.to(sessionId).emit("file-complete");
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
};
