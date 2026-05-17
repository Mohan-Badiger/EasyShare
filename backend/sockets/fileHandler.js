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

  // WebRTC Signaling
  socket.on("webrtc-offer", (data) => {
    socket.to(data.sessionId).emit("webrtc-offer", data);
  });

  socket.on("webrtc-answer", (data) => {
    socket.to(data.sessionId).emit("webrtc-answer", data.answer);
  });

  socket.on("webrtc-ice-candidate", (data) => {
    socket.to(data.sessionId).emit("webrtc-ice-candidate", data.candidate);
  });

  // Stream file metadata (fallback/legacy)
  socket.on("file-meta", (data) => {
    const { sessionId } = data;
    socket.to(sessionId).emit("file-meta", data);
  });

  // Stream chunk data (fallback/legacy)
  socket.on("file-chunk", (data, callback) => {
    const { sessionId } = data;
    socket.to(sessionId).emit("file-chunk", data);
    if (typeof callback === "function") callback();
  });

  // File transfer complete (fallback/legacy)
  socket.on("file-complete", ({ sessionId }) => {
    socket.to(sessionId).emit("file-complete");
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
};
