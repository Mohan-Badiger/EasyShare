EasyShare — Real-Time Cross-Device File Sharing.

> Share big files instantly with no login and no storage.
> Connected by QR. Powered by WebSockets.

Live Demo : https://easysharefiles.vercel.app

### 🧠 Problem

Most file sharing tools need:
Login/user accounts  
Cloud storage upload  
Time-consuming processing 

---

### 🚀 Solution: EasyShare

A **peer-style file transfer** web app where:

* Sender generates a **Join Code** or **QR**
* Receiver scans → auto-connects to session
* Files stream **live** between devices
* No saving on server → maximum privacy

---

## ✨ Features

✔ Drag & Drop multi-file upload

✔ QR Code + Auto-Join support

✔ Secure unique session IDs

✔ Mobile ↔ Desktop transfers

✔ No accounts, no history, no cloud storage

✔ Chunk-based live streaming for large files

✔ Real-time WebSocket communication


> A true “no-trace” sharing experience 🔐

---

## 🛠️ Tech Stack

| Layer      | Technology                                                          |
| ---------- | ------------------------------------------------------------------- |
| Frontend   | React, Tailwind CSS, Socket.IO Client, React-QR-Code |
| Backend    | Node.js, Express, Socket.IO WebSocket Server                        |
| Deployment | **Vercel** (Frontend) + **Render** (Backend)                        |

---

## 🧩 System Architecture

```
┌──────────┐       ┌────────────────────────┐       ┌───────────┐
│  Sender  │◄────► │ Socket.IO Web Server   │ ◄────►│ Receiver  │
└──────────┘       └────────────────────────┘       └───────────┘
       │                       │                          │
    Select File        Generate Session ID             Scan QR
       │                       │                          │
       └────────► Stream File Chunks Live ◄──────────────┘
```

---

## 🌍 Live URLs

| Service           | Status  
| ----------------- | ------- 
| Frontend (Vercel) | 🟢 Live 
| Backend (Render)  | 🟢 Live 


## 🖥️ Installation (Local)

```bash
git clone https://github.com/Mohan-Badiger/easyshare.git
cd easyshare
```

### 📌 Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs → `http://localhost:5173`

### 📌 Install & Run Backend

```bash
cd ../easyshare-backend
npm install
npm start
```

Runs → `http://localhost:4000`

---

## 🔐 Environment Variables

### Frontend → `.env.development`

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_APP_BASE_URL=http://localhost:5173
```

## 🛣️ Roadmap

* 📊 File transfer progress indicator
* 🔁 Resume transfer on reconnect
* ⚡ Larger file optimization
* 🔐 End-to-end user encryption
* 📦 Folder upload with auto-zip
* 🌐 First public beta release

---

## 🤝 Contributing

Contributions are welcome!
Feel free to open an issue or submit a PR 💡

---

## 🧑‍💻 Developer

**Mohan Badiger**
💼 Full-Stack & Real-Time Web Developer

🔗 LinkedIn: https://www.linkedin.com/in/mohan-badiger

Email: mohanbadiger250@gmail.com
Site : mohanbadiger.site

##ScreenShots

<img width="1914" height="907" alt="Screenshot 2025-11-21 174738" src="https://github.com/user-attachments/assets/a089db83-300c-45bf-9952-c39dbb1e8e3b" />

<img width="1917" height="906" alt="Screenshot 2025-11-21 174751" src="https://github.com/user-attachments/assets/ade03504-3024-40e3-8c33-626a9288d098" />

<img width="1915" height="905" alt="Screenshot 2025-11-21 175031" src="https://github.com/user-attachments/assets/8f5a37cf-fae5-4f21-b58a-4288b2e58562" />

<img width="1915" height="907" alt="Screenshot 2025-11-21 175050" src="https://github.com/user-attachments/assets/f9273cd3-dfb0-4a55-9ad4-4ef463405df9" />




