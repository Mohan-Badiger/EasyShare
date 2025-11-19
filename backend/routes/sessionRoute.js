import express from "express";
import generateCode from "../utils/generateCode.js";

const router = express.Router();

// In-memory store for sessions
// Key: code  Value: { senderSocketId, receiverSocketId, expiresAt }
const sessions = {};

//Create session
router.post("/create", (req, res) => {
  const sessionId = generateCode();

  sessions[sessionId] = {
    senderSocketId: null,
    receiverSocketId: null,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes expiry
  };

  return res.json({
    sessionId,
    message: "Session created",
  });
});

// ✔ Validate join code
router.post("/validate", (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ valid: false, message: "Invalid code" });
  }

  const session = sessions[sessionId];
  if (session.expiresAt < Date.now()) {
    delete sessions[sessionId];
    return res.status(400).json({ valid: false, message: "Session expired" });
  }

  return res.json({ valid: true, message: "Valid session" });
});

export { router as sessionRoute, sessions };
