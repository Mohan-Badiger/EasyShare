import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import socket from "../socket";
import QRCode from "react-qr-code";
import { toast } from 'react-toastify';
import NavBar from '../components/NavBar.jsx';
import JSZip from "jszip";
import { generateEncryptionKey, encryptChunk } from "../utils/crypto.js";
import { BACKEND_URL } from "../config.js";
const Sender = () => {

  const APP_BASE_URL = window.location.origin;

  const [joinCode, setJoinCode] = useState("");
  // Selected files are now an array of objects: { id, file, name, size, type, progress, speed, eta, thumbnail, status }
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [codeLocked, setCodeLocked] = useState(false);

  const [receiverConnected, setReceiverConnected] = useState(false);
  const [webrtcReady, setWebrtcReady] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // E2EE
  const [cryptoKey, setCryptoKey] = useState(null);
  const [urlHash, setUrlHash] = useState("");

  // WebRTC
  const pcRef = useRef(null);
  const dcRef = useRef(null);
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
    const handleReceiverConnected = async () => {
      console.log("✅ Receiver connected to session, initiating WebRTC...");
      setReceiverConnected(true);
      playSound('connect');
      initWebRTC();
    };

    socket.on("receiver-connected", handleReceiverConnected);

    // WebRTC Signaling Handlers
    socket.on("webrtc-answer", async (answer) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("webrtc-ice-candidate", async (candidate) => {
      if (pcRef.current && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.off("receiver-connected");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
    };
  }, [joinCode]);

  const initWebRTC = async () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Create Data Channel
    const dc = pc.createDataChannel("fileTransfer");
    dc.binaryType = "arraybuffer";
    dcRef.current = dc;

    dc.onopen = () => {
      console.log("WebRTC DataChannel Opened!");
      dc.bufferedAmountLowThreshold = 1024 * 1024; // 1 MB
      setWebrtcReady(true);
      toast.success("P2P Connected!");
    };

    dc.onclose = () => {
      console.log("WebRTC DataChannel Closed");
      setWebrtcReady(false);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", { sessionId: joinCode, candidate: event.candidate });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("webrtc-offer", { sessionId: joinCode, offer, key: urlHash });
  };

  const handleGenerateCode = async () => {
    if (codeLocked || isGenerating) return;
    try {
      setIsGenerating(true);
      // Generate E2EE Key
      const { key, base64Key } = await generateEncryptionKey();
      setCryptoKey(key);
      setUrlHash(base64Key);

      const res = await axios.post(BACKEND_URL + "/api/session/create");
      const code = res.data.sessionId;
      setJoinCode(code);

      if (!socket.connected) socket.connect();
      socket.emit("register-sender", { sessionId: code });
      setCodeLocked(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create session.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateFileState = (id, updates) => {
    setSelectedFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSendClick = async () => {
    if (!joinCode || !receiverConnected) {
      toast.error("Waiting for receiver.");
      return;
    }
    if (selectedFiles.length === 0) return;
    if (isSending) return;

    setIsSending(true);
    try {
      for (const fileObj of selectedFiles) {
        if (fileObj.status !== "Completed") {
          await sendSingleFile(fileObj);
        }
      }
      playSound('success');
      toast.success("Sent!");
    } catch (err) {
      console.error(err);
      toast.error("Send failed.");
    } finally {
      setIsSending(false);
    }
  };

  const sendSingleFile = (fileObj) => {
    return new Promise((resolve, reject) => {
      updateFileState(fileObj.id, { status: "Sending" });
      const dc = dcRef.current;
      const file = fileObj.file;
      const chunkSize = 64 * 1024 - 28; // 64 KB total after encryption
      let offset = 0;
      let startTime = Date.now();
      let lastTime = startTime;
      let lastOffset = 0;

      const useWebRTC = webrtcReady && dc && dc.readyState === "open";

      // Send Metadata
      const meta = {
        fileName: fileObj.name,
        fileSize: fileObj.size,
        fileType: fileObj.type
      };

      if (useWebRTC) {
        dc.send(JSON.stringify({ type: "meta", ...meta }));
      } else {
        socket.emit("file-meta", { sessionId: joinCode, ...meta });
      }

      const reader = new FileReader();

      const sendNextChunk = () => {
        if (offset >= file.size) {
          if (useWebRTC) {
            dc.send(JSON.stringify({ type: "complete" }));
          } else {
            socket.emit("file-complete", { sessionId: joinCode });
          }
          updateFileState(fileObj.id, { progress: 100, status: "Completed", speed: 0 });
          resolve();
          return;
        }

        // Wait if buffer is getting full (WebRTC only)
        if (useWebRTC && dc.bufferedAmount > 4 * 1024 * 1024) {
          dc.onbufferedamountlow = () => {
            dc.onbufferedamountlow = null;
            sendNextChunk();
          };
          return;
        }

        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = async (e) => {
        try {
          const buffer = e.target.result;
          const encrypted = await encryptChunk(cryptoKey, buffer);

          offset += buffer.byteLength;

          const now = Date.now();
          if (now - lastTime > 500) {
            const progress = Math.round((offset / file.size) * 100);
            const speed = (offset - lastOffset) / ((now - lastTime) / 1000); // bytes per sec
            const eta = (file.size - offset) / speed;
            updateFileState(fileObj.id, { progress, speed, eta });
            lastTime = now;
            lastOffset = offset;
          }

          if (useWebRTC) {
            dc.send(encrypted);
            sendNextChunk();
          } else {
            socket.emit("file-chunk", { sessionId: joinCode, chunk: encrypted }, () => {
              sendNextChunk();
            });
          }
        } catch (error) {
          console.error("Error processing chunk:", error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(error);
      };

      // Wait for ACK of meta before streaming if using WebRTC
      if (useWebRTC) {
        const onMessage = (e) => {
          if (e.data === "meta-ack") {
            dc.removeEventListener("message", onMessage);
            sendNextChunk();
          }
        };
        dc.addEventListener("message", onMessage);
      } else {
        sendNextChunk();
      }
    });
  };

  const processFiles = async (files, items) => {
    const newFiles = [];

    // Handle JSZip for folders
    const zip = new JSZip();
    let hasFolders = false;

    const readEntry = async (entry, path = "") => {
      if (entry.isFile) {
        return new Promise(resolve => {
          entry.file(f => {
            zip.file(path + f.name, f);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        hasFolders = true;
        const dirReader = entry.createReader();
        const entries = await new Promise(resolve => dirReader.readEntries(resolve));
        for (const e of entries) {
          await readEntry(e, path + entry.name + "/");
        }
      }
    };

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry && entry.isDirectory) {
            await readEntry(entry);
          }
        }
      }
    }

    if (hasFolders) {
      toast.info("Zipping folder...");
      const blob = await zip.generateAsync({ type: "blob" });
      const zipFile = new File([blob], "folder_archive.zip", { type: "application/zip" });
      newFiles.push(zipFile);
    } else {
      newFiles.push(...files);
    }

    const processed = await Promise.all(newFiles.map(async (f) => {
      let thumbnail = null;
      if (f.type.startsWith('image/')) {
        thumbnail = URL.createObjectURL(f);
      }
      return {
        id: Math.random().toString(36).substring(7),
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        progress: 0,
        speed: 0,
        eta: 0,
        status: "Pending",
        thumbnail
      };
    }));

    setSelectedFiles(prev => [...prev, ...processed]);
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files, null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    const items = e.dataTransfer.items;
    processFiles(files, items);
  };

  const handleDragEvents = (e, drag) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(drag);
  };

  const handleCopyCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      toast.success("Code copied to clipboard!");
    }
  };

  const allFilesCompleted = selectedFiles.length > 0 && selectedFiles.every(f => f.status === "Completed");
  const isSendDisabled = !joinCode || selectedFiles.length === 0 || isSending || (!webrtcReady && !receiverConnected) || allFilesCompleted;

  return (
    <>
      <NavBar />
      <div className="min-h-[88vh] bg-white text-gray-900 flex items-center justify-center px-4 py-2 sm:py-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_1.9fr] gap-8">

          {/* LEFT SIDE */}
          <div className="bg-gray-50 border border-indigo-200 rounded-md p-6 lg:p-8 shadow-sm flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Sender Session</h2>
              <p className="text-sm text-gray-500">
                Generate a join code and share it or let others scan the QR. E2E Encrypted.
              </p>
            </div>

            {/* Join Code Box */}
            <div className="bg-white border border-indigo-200 rounded-md p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Join Code
                </p>
                <p className="text-2xl font-sans font-semibold flex items-center gap-2">
                  {joinCode || "------"}
                  {joinCode && (
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      title="Copy code"
                      className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <i className="far fa-copy text-lg"></i>
                    </button>
                  )}
                </p>
                {receiverConnected && (
                  <p className="text-[11px] text-green-600 mt-1 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Receiver connected
                  </p>
                )}
              </div>
              {codeLocked ? (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-sm text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-sm text-white text-sm font-medium transition-colors
                  ${isGenerating
                      ? "bg-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </button>
              )}
            </div>

            {/* QR Preview */}
            <div className="bg-white border border-indigo-200 rounded-md p-4 flex flex-col items-center gap-3">
              <p className="text-xs uppercase tracking-wide text-gray-700">QR Code (Scan to join securely)</p>

              <div className="w-40 h-40 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center">
                {joinCode && urlHash ? (
                  <div className="bg-white p-2">
                    <QRCode
                      value={`${APP_BASE_URL}/receiver?code=${joinCode}#key=${urlHash}`}
                      size={128}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 text-center px-2">
                    Generate a code to see QR
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE - DRAG & DROP */}
          <div
            className={`rounded-md border-2 border-dashed p-8 flex flex-col items-center justify-center gap-4 transition-colors shadow-sm ${isDragging
              ? "border-indigo-200 bg-indigo-50"
              : "border-gray-300 bg-gray-100"
              }`}
            onDrop={handleDrop}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-md bg-white border border-indigo-200 flex items-center justify-center">
                <i className="fas fa-cloud-arrow-up text-2xl text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Drag &amp; drop files or folders here</p>
                <p className="text-sm text-gray-500">
                  or{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-500 underline underline-offset-2"
                  >
                    browse from device
                  </button>
                </p>
              </div>
            </div>

            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFilesSelected}
              className="hidden"
            />

            {/* Files List */}
            {selectedFiles.length > 0 && (
              <div className="w-full mt-4 max-h-56 overflow-y-auto bg-white border border-indigo-200 rounded-md p-3">
                <p className="text-xs text-gray-500 mb-2">
                  Selected files ({selectedFiles.length})
                </p>
                <ul className="text-xs space-y-2">
                  {selectedFiles.map((fObj) => (
                    <li
                      key={fObj.id}
                      className="flex flex-col gap-1 bg-gray-50 border border-gray-200 rounded-sm px-3 py-2"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {fObj.thumbnail ?
                            <img src={fObj.thumbnail} alt="thumb" className="w-8 h-8 object-cover rounded-sm border border-gray-300" />
                            : <div className="w-8 h-8 bg-gray-200 rounded-sm border border-gray-300 flex items-center justify-center text-gray-500"><i className="fas fa-file"></i></div>
                          }
                          <div className="flex flex-col overflow-hidden">
                            <p className="truncate text-gray-700 font-medium">
                              {fObj.name}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {(fObj.size / (1024 * 1024)).toFixed(2)} MB
                              {fObj.speed > 0 && ` • ${(fObj.speed / (1024 * 1024)).toFixed(1)} MB/s`}
                              {fObj.eta > 0 && ` • ${Math.round(fObj.eta)}s left`}
                            </p>
                          </div>
                        </div>

                        {fObj.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => setSelectedFiles(prev => prev.filter(f => f.id !== fObj.id))}
                            className="text-red-500 hover:text-red-600 text-xs font-semibold px-2 py-1"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                        {fObj.status === "Completed" && (
                          <span className="text-green-500 text-xs font-semibold px-2 py-1"><i className="fas fa-check"></i></span>
                        )}
                      </div>

                      {/* Premium Progress Bar */}
                      {fObj.status !== "Pending" && (
                        <div className="w-full bg-slate-200/70 rounded-full h-2 mt-2 overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-300 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)] relative overflow-hidden"
                            style={{ width: `${fObj.progress}%` }}
                          >
                            {fObj.status === "Sending" && (
                              <div className="absolute inset-0 bg-white/20 w-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem', animation: 'progress-stripes 1s linear infinite' }}></div>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Send Files Button */}
            <button
              type="button"
              onClick={handleSendClick}
              disabled={isSendDisabled}
              className={`mt-4 px-4 py-2 rounded-sm text-white text-sm font-medium transition-colors w-full sm:w-auto
              ${isSendDisabled
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
                }`}
            >
              {isSending ? "Sending Securely..." : allFilesCompleted ? "All Sent" : "Send Files Securely"}
            </button>

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

export default Sender;
