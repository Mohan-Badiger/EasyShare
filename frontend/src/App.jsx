import React, { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Hero from './components/Hero'
import Sender from './components/Sender'
import Receiver from './components/Receiver'
import {ToastContainer} from 'react-toastify'
import { socket } from './socket'
import { BACKEND_URL } from './config'

const App = () => {
  useEffect(() => {
    // 1. Ping the backend via HTTP to wake up the Render server immediately
    fetch(BACKEND_URL)
      .catch(() => console.log("Pre-warming backend server..."));
      
    // 2. Connect the WebSocket preemptively so it's instantly ready when needed
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  return (
    <div>
      <ToastContainer/>
      <Routes>
        <Route path='/' element={<Hero/>}/>
        <Route path='/easyshare' element={<Home/>}/>
        <Route path='/sender' element={<Sender/>}/>
        <Route path='/receiver' element={<Receiver/>}/>
      </Routes>
    </div>
  )
}

export default App