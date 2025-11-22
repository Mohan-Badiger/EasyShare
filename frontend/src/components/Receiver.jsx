import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import axios from "axios";
import socket from "../socket"; // update path if needed
import {toast} from 'react-toastify'
import link from '../assets/link.png'
import NavBar from "./NavBar";

const Receiver = () => {
  const [joinCode, setJoinCode] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);

  // 🔹 For receiving file data
  const fileMetaRef = useRef(null);
  const chunksRef = useRef([]);
  const [receivedFiles, setReceivedFiles] = useState([]); // 👈 UI list

  // 🔄 Socket listeners for file receiving
  useEffect(() => {
    const handleFileMeta = (meta) => {
      console.log("📥 File metadata received:", meta);
      fileMetaRef.current = meta;
      chunksRef.current = [];

      // Add file to receivedFiles list (as "Receiving")
      setReceivedFiles((prev) => [
        ...prev,
        {
          fileName: meta.fileName,
          fileSize: meta.fileSize,
          fileType: meta.fileType,
          status: "Receiving", // or "Downloading"
        },
      ]);
    };

    const handleFileChunk = ({ chunk }) => {
      if (chunk) {
        chunksRef.current.push(chunk);
      }
    };

    const handleFileComplete = () => {
      const meta = fileMetaRef.current;
      if (!meta || chunksRef.current.length === 0) return;

      const blob = new Blob(chunksRef.current, {
        type: meta.fileType || "application/octet-stream",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta.fileName || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      console.log("✅ File downloaded:", meta.fileName);

      // Update status in the UI list
      setReceivedFiles((prev) =>
        prev.map((f, idx, arr) => {
          // assume last added file corresponds to this transfer
          if (idx === arr.length - 1 && f.fileName === meta.fileName) {
            return { ...f, status: "Completed" };
          }
          return f;
        })
      );

      // reset refs
      fileMetaRef.current = null;
      chunksRef.current = [];
    };

    socket.on("file-meta", handleFileMeta);
    socket.on("file-chunk", handleFileChunk);
    socket.on("file-complete", handleFileComplete);

    return () => {
      socket.off("file-meta", handleFileMeta);
      socket.off("file-chunk", handleFileChunk);
      socket.off("file-complete", handleFileComplete);
    };
  }, []);

  // 🔹 Join session (manual or QR)
  const handleJoinSession = async (codeFromQR) => {
    const code = (codeFromQR || joinCode).trim().toUpperCase();
    if (!code || isJoined || isJoining) return;

    try {
      setIsJoining(true);

      const res = await axios.post(import.meta.env.VITE_BACKEND_URL+"/api/session/validate", // ⬅️ use your backend IP/port here 
      { sessionId: code }
      );

      if (!res.data.valid) {
        toast.error(res.data.message || "Invalid or expired session code.");
        return;
      }

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit("register-receiver", { sessionId: code });

      setJoinCode(code);
      setIsJoined(true);
    } catch (err) {
      console.error("Error joining session:", err);
      toast.error("Unable to join session.");
    } finally {
      setIsJoining(false);
    }
  };

  const startCamera = async () => {
    setCameraError("");
    setCameraOn(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      codeReader.decodeFromVideoDevice(null, videoRef.current, (result) => {
        if (!!result) {
          const code = result.getText().toUpperCase();
          stopCamera();
          handleJoinSession(code); // join from QR
        }
      });
    } catch (err) {
      console.error(err);
      setCameraError("Camera access denied or unavailable.");
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      codeReaderRef.current = null;

      const oldVideo = videoRef.current;
      if (oldVideo && oldVideo.parentNode) {
        const newVideo = oldVideo.cloneNode(true);
        oldVideo.parentNode.replaceChild(newVideo, oldVideo);
        videoRef.current = newVideo;
      }
    } catch (err) {
      console.error("Camera cleanup error:", err);
    }

    setCameraOn(false);
  };

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line
  }, []);


  // Auto-join when ?code=XXXX is present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");

    if (codeParam) {
      const upper = codeParam.toUpperCase();
      setJoinCode(upper);
      handleJoinSession(upper); // 🔥 auto join
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <>
    <NavBar/>
    <div className="min-h-[88vh] bg-white text-gray-900 flex items-center justify-center px-4 py-2 sm:py-0">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_1.9fr] gap-8">

        {/* LEFT SIDE – JOIN SESSION */}
        <div className="bg-gray-50 border border-indigo-200 rounded-md p-6 lg:p-8 shadow-sm flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold mb-1">Join Session</h2>
            <p className="text-sm text-gray-500">
              Enter a join code or scan a QR to connect with the sender.
            </p>
          </div>

          {/* Join Code Input */}
          <div className="bg-white border border-indigo-200 rounded-md p-4 flex flex-col gap-3">
            <label htmlFor="joinCode" className="text-xs uppercase tracking-wide text-gray-500">
              Join Code
            </label>

            {/* Responsive Layout */}
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

              <button
                type="button"
                onClick={() => handleJoinSession()}
                disabled={isJoined || isJoining}
                className={`w-full md:w-auto px-4 py-2 rounded-sm text-white text-sm font-medium transition-colors
                  ${(isJoined || isJoining)
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
              >
                {isJoined
                  ? "Joined"
                  : isJoining
                    ? "Joining..."
                    : "Join"}
              </button>
            </div>

            {/* Status */}
            {isJoined ? (
              <p className="text-xs text-green-600 mt-1">
                Connected to session <span className="font-mono font-semibold">{joinCode}</span>.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                Ask the sender to share their join code with you.
              </p>
            )}
          </div>

          {/* QR Scanner */}
          <div className="bg-white border border-indigo-200 rounded-md p-4 flex flex-col items-center">
            <p className="text-xs uppercase tracking-wide text-gray-500">Developed By</p>
            <p className="text-md uppercase font-semibold font-sans tracking-wide text-gray-600">Mohan Badiger</p>
           <div className="flex gap-2 align-middle items-center">
            <a href="https://mohanbadiger.vercel.app" target="_blank" className="text-xs uppercase text-gray-500 cursor-pointer hover:text-indigo-600">click here to visit website</a>
            <img className="w-3 h-3" src={link} alt="" />
            </div>
            {/* {!cameraOn && (
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 rounded-sm bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
              >
                Open Camera
              </button>
            )} */}

            {/* {cameraOn && (
              <>
                <div className="w-56 h-56 rounded-xl overflow-hidden border border-gray-300">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                </div>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-sm bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-medium transition-colors"
                >
                  Stop Camera
                </button>
              </>
            )} */}

            {cameraError && (
              <p className="text-[11px] text-red-500 text-center">{cameraError}</p>
            )}
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
                  ? "Keep this page open. Files will appear here when the sender shares."
                  : "Enter a valid join code or scan the sender's QR code."}
              </p>
            </div>
          </div>

          <div className="w-full mt-4 max-h-48 overflow-y-auto bg-white border border-indigo-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Incoming Files</p>

            {receivedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-xs text-gray-400 gap-2 py-6">
                <i className="fas fa-folder-open text-lg" />
                <p>No files received yet.</p>
              </div>
            ) : (
              <ul className="text-xs space-y-2">
                {receivedFiles.map((file, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <div className="flex-1">
                      <p className="text-gray-700 font-medium truncate">
                        {file.fileName}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
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
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
    </>
  );
};

export default Receiver;
