import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import socket from "../socket";
import { toast } from 'react-toastify';
import link from '../assets/link.png';
import NavBar from "./NavBar";
import { importEncryptionKey, decryptChunk } from "../utils/crypto.js";
import { BACKEND_URL } from "../config.js";
const Receiver = () => {
  const [joinCode, setJoinCode] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [receivedFiles, setReceivedFiles] = useState([]);
  const [webrtcReady, setWebrtcReady] = useState(false);

  // E2EE
  const [cryptoKey, setCryptoKey] = useState(null);
  const cryptoKeyRef = useRef(null);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const fileMetaRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastOffsetRef = useRef(0);
  const totalReceivedRef = useRef(0);
  const activeFileIdRef = useRef(null);

  const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  const playSound = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      if (type === 'connect') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'success') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
        if (navigator.vibrate) navigator.vibrate(200);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    socket.on("webrtc-offer", async (data) => {
      console.log("📥 Received WebRTC Offer");
      const offer = data.offer;
      if (data.key && !cryptoKeyRef.current) {
        try {
          const k = await importEncryptionKey(data.key);
          setCryptoKey(k);
          cryptoKeyRef.current = k;
        } catch (e) { }
      }
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-ice-candidate", { sessionId: data.sessionId, candidate: event.candidate });
        }
      };

      pc.ondatachannel = (event) => {
        const dc = event.channel;
        dcRef.current = dc;
        dc.binaryType = "arraybuffer";

        dc.onopen = () => {
          console.log("✅ WebRTC DataChannel Opened!");
          setWebrtcReady(true);
          playSound('connect');
          toast.success("P2P Connected!");
        };

        let decryptChain = Promise.resolve();

        dc.onmessage = (e) => {
          if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            if (data.type === "meta") {
              const fileId = Math.random().toString(36).substring(7);
              activeFileIdRef.current = fileId;
              fileMetaRef.current = { name: data.fileName, size: data.fileSize, type: data.fileType };
              chunksRef.current = [];
              totalReceivedRef.current = 0;
              startTimeRef.current = Date.now();
              lastTimeRef.current = Date.now();
              lastOffsetRef.current = 0;

              setReceivedFiles(prev => [...prev, {
                id: fileId,
                name: data.fileName,
                size: data.fileSize,
                type: data.fileType,
                progress: 0,
                speed: 0,
                eta: 0,
                status: "Receiving"
              }]);

              // Acknowledge meta
              dc.send("meta-ack");
            } else if (data.type === "complete") {
              decryptChain = decryptChain.then(() => {
                const meta = fileMetaRef.current;
                const blob = new Blob(chunksRef.current, { type: meta.type || "application/octet-stream" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = meta.name || "download";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);

                playSound('success');

                setReceivedFiles(prev => prev.map(f => f.id === activeFileIdRef.current ? { ...f, status: "Completed", progress: 100, speed: 0, eta: 0 } : f));
              });
            }
          } else {
            // Binary chunk (ArrayBuffer)
            const chunkData = e.data;
            decryptChain = decryptChain.then(async () => {
              try {
                let chunk = chunkData;
                if (cryptoKeyRef.current) {
                  chunk = await decryptChunk(cryptoKeyRef.current, chunk);
                }
                chunksRef.current.push(chunk);
                totalReceivedRef.current += chunk.byteLength;

                const now = Date.now();
                if (now - lastTimeRef.current > 500) {
                  const meta = fileMetaRef.current;
                  const offset = totalReceivedRef.current;
                  const progress = Math.round((offset / meta.size) * 100);
                  const speed = (offset - lastOffsetRef.current) / ((now - lastTimeRef.current) / 1000); // bytes/sec
                  const eta = (meta.size - offset) / speed;

                  setReceivedFiles(prev => prev.map(f => f.id === activeFileIdRef.current ? { ...f, progress, speed, eta } : f));

                  lastTimeRef.current = now;
                  lastOffsetRef.current = offset;
                }
              } catch (err) {
                console.error("Decryption or processing error:", err);
              }
            });
          }
        };

        dc.onclose = () => {
          console.log("❌ WebRTC DataChannel Closed");
          setWebrtcReady(false);
        };
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { sessionId: data.sessionId, answer });
    });

    socket.on("webrtc-ice-candidate", async (candidate) => {
      if (pcRef.current && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // --- FALLBACK: WebSocket Transfer ---
    const handleMeta = (data) => {
      const fileId = Math.random().toString(36).substring(7);
      activeFileIdRef.current = fileId;
      fileMetaRef.current = { name: data.fileName, size: data.fileSize, type: data.fileType };
      chunksRef.current = [];
      totalReceivedRef.current = 0;
      startTimeRef.current = Date.now();
      lastTimeRef.current = Date.now();
      lastOffsetRef.current = 0;

      setReceivedFiles(prev => [...prev, {
        id: fileId,
        name: data.fileName,
        size: data.fileSize,
        type: data.fileType,
        progress: 0,
        speed: 0,
        eta: 0,
        status: "Receiving"
      }]);
    };

    let wsDecryptChain = Promise.resolve();

    const handleChunk = (data) => {
      wsDecryptChain = wsDecryptChain.then(async () => {
        try {
          let chunk = data.chunk;
          if (cryptoKeyRef.current) {
            chunk = await decryptChunk(cryptoKeyRef.current, chunk);
          }
          chunksRef.current.push(chunk);
          totalReceivedRef.current += chunk.byteLength;

          const now = Date.now();
          if (now - lastTimeRef.current > 500) {
            const meta = fileMetaRef.current;
            const offset = totalReceivedRef.current;
            const progress = Math.round((offset / meta.size) * 100);
            const speed = (offset - lastOffsetRef.current) / ((now - lastTimeRef.current) / 1000);
            const eta = (meta.size - offset) / speed;

            setReceivedFiles(prev => prev.map(f => f.id === activeFileIdRef.current ? { ...f, progress, speed, eta } : f));

            lastTimeRef.current = now;
            lastOffsetRef.current = offset;
          }
        } catch (err) {
          console.error("WS Decryption error:", err);
        }
      });
    };

    const handleComplete = () => {
      wsDecryptChain = wsDecryptChain.then(() => {
        const meta = fileMetaRef.current;
        const blob = new Blob(chunksRef.current, { type: meta.type || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = meta.name || "download";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        playSound('success');

        setReceivedFiles(prev => prev.map(f => f.id === activeFileIdRef.current ? { ...f, status: "Completed", progress: 100, speed: 0, eta: 0 } : f));
      });
    };

    socket.on("file-meta", handleMeta);
    socket.on("file-chunk", handleChunk);
    socket.on("file-complete", handleComplete);

    return () => {
      socket.off("webrtc-offer");
      socket.off("webrtc-ice-candidate");
      socket.off("file-meta", handleMeta);
      socket.off("file-chunk", handleChunk);
      socket.off("file-complete", handleComplete);
    };
  }, [joinCode, cryptoKey]);

  const handleJoinSession = async (codeParam, keyParam) => {
    const code = (codeParam || joinCode).trim().toUpperCase();
    if (!code || isJoined || isJoining) return;

    try {
      setIsJoining(true);

      // Handle Encryption Key
      let k = null;
      if (keyParam) {
        try {
          const decodedKey = decodeURIComponent(keyParam);
          k = await importEncryptionKey(decodedKey);
          setCryptoKey(k);
          cryptoKeyRef.current = k;
          toast.info("E2EE Active");
        } catch (e) {
          console.error("Invalid key:", e);
          toast.error("Invalid E2EE Key.");
        }
      }

      const res = await axios.post(BACKEND_URL + "/api/session/validate", { sessionId: code });

      if (!res.data.valid) {
        toast.error(res.data.message || "Invalid session.");
        return;
      }

      if (!socket.connected) socket.connect();
      socket.emit("register-receiver", { sessionId: code });

      setJoinCode(code);
      setIsJoined(true);
    } catch (err) {
      console.error(err);
      toast.error("Join failed.");
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");

    // Check hash for E2EE key
    let keyHash = window.location.hash.replace("#key=", "");
    if (!keyHash && window.location.hash.startsWith("#key=")) {
      keyHash = window.location.hash.split("=")[1];
    }
    if (keyHash) {
      keyHash = decodeURIComponent(keyHash);
    }

    if (codeParam) {
      const upper = codeParam.toUpperCase();
      setJoinCode(upper);
      handleJoinSession(upper, keyHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <NavBar />
      <div className="min-h-[88vh] bg-white text-gray-900 flex items-center justify-center px-4 py-2 sm:py-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_1.9fr] gap-8">

          {/* LEFT SIDE – JOIN SESSION */}
          <div className="bg-gray-50 border border-indigo-200 rounded-md p-6 lg:p-8 shadow-sm flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Join Session</h2>
              <p className="text-sm text-gray-500">
                Enter a join code or scan a QR to connect with the sender securely.
              </p>
            </div>

            <div className="bg-white border border-indigo-200 rounded-md p-4 flex flex-col gap-3">
              <label htmlFor="joinCode" className="text-xs uppercase tracking-wide text-gray-500">
                Join Code
              </label>

              <div className="flex flex-col md:flex-row gap-3 w-full">
                <input
                  id="joinCode"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 4F9KQZ"
                  className="flex-1 px-3 py-2 rounded-sm border border-gray-300 text-sm 
                outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono min-w-[140px]"
                  disabled={isJoined}
                />

                {isJoined ? (
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/receiver'; }}
                    className="w-full md:w-auto px-4 py-2 rounded-sm text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 text-sm font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleJoinSession()}
                    disabled={isJoining}
                    className={`w-full md:w-auto px-4 py-2 rounded-sm text-white text-sm font-medium transition-colors
                    ${isJoining
                        ? "bg-indigo-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                  >
                    {isJoining ? "Joining..." : "Join"}
                  </button>
                )}
              </div>

              {isJoined ? (
                <div className="flex flex-col gap-1 items-start mt-1">
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    Connected to session <span className="font-mono font-semibold">{joinCode}</span>.
                    {webrtcReady && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2"></span>}
                    {webrtcReady && <span>P2P Ready</span>}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Ask the sender to share their join code with you.
                </p>
              )}
            </div>

            <div className="bg-white border border-indigo-200 rounded-md p-4 flex flex-col items-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">Developed By</p>
              <p className="text-md uppercase font-semibold font-sans tracking-wide text-gray-600">Mohan Badiger</p>
              <div className="flex gap-2 align-middle items-center">
                <a href="https://mohanbadiger.vercel.app" target="_blank" className="text-xs uppercase text-gray-500 cursor-pointer hover:text-indigo-600">click here to visit website</a>
                <img className="w-3 h-3" src={link} alt="" />
              </div>
            </div>
          </div>

          {/* RIGHT SIDE – WAITING FOR FILES */}
          <div className="rounded-md border-2 border-dashed border-gray-300 bg-gray-100 p-8 flex flex-col items-center justify-center gap-4 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-md bg-white border border-indigo-200 flex items-center justify-center">
                <i className="fas fa-cloud-arrow-down text-2xl text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {isJoined ? "Waiting for files from sender..." : "Join a session to start receiving files"}
                </p>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                  {isJoined
                    ? "Keep this page open. Files will stream directly to you."
                    : "Enter a valid join code or scan the sender's QR code."}
                </p>
              </div>
            </div>

            <div className="w-full mt-4 max-h-64 overflow-y-auto bg-white border border-indigo-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Incoming Files</p>

              {receivedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-xs text-gray-400 gap-2 py-6">
                  <i className="fas fa-folder-open text-lg" />
                  <p>No files received yet.</p>
                </div>
              ) : (
                <ul className="text-xs space-y-2">
                  {receivedFiles.map((file) => (
                    <li
                      key={file.id}
                      className="flex flex-col gap-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1 overflow-hidden">
                          <p className="text-gray-700 font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                            {file.speed > 0 && ` • ${(file.speed / (1024 * 1024)).toFixed(1)} MB/s`}
                            {file.eta > 0 && ` • ${Math.round(file.eta)}s left`}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${file.status === "Completed"
                            ? "text-green-600"
                            : "text-indigo-500"
                            }`}
                        >
                          {file.status}
                        </span>
                      </div>

                      {/* Premium Progress Bar */}
                      {file.status !== "Pending" && (
                        <div className="w-full bg-slate-200/70 rounded-full h-2 mt-2 overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-300 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)] relative overflow-hidden"
                            style={{ width: `${file.progress}%` }}
                          >
                            {file.status === "Receiving" && (
                              <div className="absolute inset-0 bg-white/20 w-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem', animation: 'progress-stripes 1s linear infinite' }}></div>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Trust Badge */}
            <p className="mt-3 text-[11px] text-gray-500 flex items-center justify-center gap-1.5 font-medium">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-600 shadow-sm">
                <i className="fas fa-shield-alt text-[9px]"></i>
              </span>
              100% Secure & End-to-End Encrypted.
            </p>

          </div>
        </div>
      </div>
    </>
  );
};

export default Receiver;
