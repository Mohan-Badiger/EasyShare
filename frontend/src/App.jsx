import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Hero from './components/Hero'
import Sender from './components/Sender'
import Receiver from './components/Receiver'
import {ToastContainer} from 'react-toastify'

const App = () => {
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