import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import socket from "../socket"; // adjust path if needed
import QRCode from "react-qr-code";
import { toast } from 'react-toastify';
import NavBar from '../components/NavBar.jsx'

const Sender = () => {

  const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL; // 👈 put your laptop IP here

  const [joinCode, setJoinCode] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [codeLocked, setCodeLocked] = useState(false);

  const [receiverConnected, setReceiverConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Listen for receiver connection
  useEffect(() => {
    const handleReceiverConnected = () => {
      console.log("✅ Receiver connected to your session");
      setReceiverConnected(true);
    };

    socket.on("receiver-connected", handleReceiverConnected);

    return () => {
      socket.off("receiver-connected", handleReceiverConnected);
    };
  }, []);

  // Generate code from backend + register sender
  const handleGenerateCode = async () => {
    if (codeLocked || isGenerating) return;

    try {
      setIsGenerating(true);

      const res = await axios.post(import.meta.env.VITE_BACKEND_URL + "/api/session/create" // 🔁 change to your backend IP if testing on mobile
      );
      const code = res.data.sessionId;

      setJoinCode(code);

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit("register-sender", { sessionId: code });
      console.log("📡 Sender registered with session:", code);

      setCodeLocked(true);
    } catch (err) {
      console.error("Error creating session:", err);
      toast.error("Failed to create session. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 🔥 Send button handler
  const handleSendClick = async () => {
    if (!joinCode) {
      toast.error("Generate a join code first.");
      return;
    }
    if (!receiverConnected) {
      toast.error("Waiting for receiver to join the session.");
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file to send.");
      return;
    }
    if (isSending) return;

    try {
      setIsSending(true);
      await sendFiles(selectedFiles, joinCode);
      console.log("✅ All files sent");
    } catch (err) {
      console.error("Error while sending files:", err);
      toast.error("Error while sending files. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Send all selected files one by one
  const sendFiles = async (files, sessionId) => {
    for (const file of files) {
      console.log("📤 Sending file:", file.name);
      // eslint-disable-next-line no-await-in-loop
      await sendSingleFile(file, sessionId);
    }
  };

  // Send a single file in chunks
  const sendSingleFile = (file, sessionId) => {
    return new Promise((resolve, reject) => {
      const chunkSize = 64 * 1024; // 64 KB
      let offset = 0;
      const reader = new FileReader();

      // Send file metadata first
      socket.emit("file-meta", {
        sessionId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      reader.onload = (e) => {
        const buffer = e.target.result; // ArrayBuffer
        socket.emit("file-chunk", {
          sessionId,
          chunk: buffer,
        });

        offset += buffer.byteLength;

        if (offset < file.size) {
          readNextChunk();
        } else {
          socket.emit("file-complete", { sessionId });
          resolve();
        }
      };

      reader.onerror = (e) => {
        console.error("File read error:", e);
        reject(e);
      };

      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
      };

      readNextChunk();
    });
  };

  const handleBrowseFiles = () => fileInputRef.current?.click();

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    setSelectedFiles(files);
  };

  const handleDragEvents = (e, drag) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(drag);
  };

  const isSendDisabled =
    !joinCode || selectedFiles.length === 0 || isSending;

  return (
    <>
      <NavBar />
      <div className="min-h-[88vh] bg-white text-gray-900 flex items-center justify-center px-4 py-2 sm:py-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_1.9fr] gap-8">

          {/* LEFT SIDE */}
          <div className="bg-gray-50 border border-indigo-200  rounded-md p-6 lg:p-8 shadow-sm flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Sender Session</h2>
              <p className="text-sm text-gray-500">
                Generate a join code and share it or let others scan the QR.
              </p>
            </div>

            {/* Join Code Box */}
            <div className="bg-white border border-indigo-200  rounded-md p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Join Code
                </p>
                <p className="text-2xl font-sans font-semibold">
                  {joinCode || "------"}
                </p>
                {receiverConnected && (
                  <p className="text-[11px] text-green-600 mt-1">
                    Receiver connected
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={isGenerating || codeLocked}
                className={`px-4 py-2 rounded-sm text-white text-sm font-medium transition-colors
                ${isGenerating || codeLocked
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
              >
                {isGenerating
                  ? "Generating..."
                  : codeLocked
                    ? "Generated"
                    : "Generate"}
              </button>
            </div>

            {/* QR Preview */}
            <div className="bg-white border border-indigo-200  rounded-md p-4 flex flex-col items-center gap-3">
              <p className="text-xs uppercase tracking-wide text-gray-700">QR Code</p>

              <div className="w-40 h-40 bg-gray-100 border border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                {joinCode ? (
                  <div className="bg-white p-2 rounded-md">
                    <QRCode
                      value={`${APP_BASE_URL}/receiver?code=${joinCode}`} // 🔥 full URL with code
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

              <p className="text-xs text-gray-500 text-center">
                Others can scan this QR to join your session.
              </p>
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
              <div className="w-14 h-14 rounded-md bg-white border border-indigo-200  flex items-center justify-center">
                <i className="fas fa-cloud-arrow-up text-2xl text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Drag &amp; drop files here</p>
                <p className="text-sm text-gray-500">
                  or{" "}
                  <button
                    type="button"
                    onClick={handleBrowseFiles}
                    className="text-indigo-600 hover:text-indigo-500 underline underline-offset-2"
                  >
                    browse from device
                  </button>
                </p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFilesSelected}
              className="hidden"
            />

            {/* Files List */}
            {selectedFiles.length > 0 && (
              <div className="w-full mt-4 max-h-40 overflow-y-auto bg-white border border-indigo-200 rounded-md p-3">
                <p className="text-xs text-gray-500 mb-2">
                  Selected files ({selectedFiles.length})
                </p>
                <ul className="text-xs space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center gap-2 bg-gray-50 border border-gray-200 rounded-sm px-3 py-2"
                    >
                      {/* File Info */}
                      <div className="flex-1">
                        <p className="truncate text-gray-700 font-medium">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFiles((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-indigo-500 hover:text-indigo-600 text-xs font-semibold px-2 py-1 rounded-lg"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 🔘 Send Files Button */}
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
              {isSending ? "Sending..." : "Send Files"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default Sender;
