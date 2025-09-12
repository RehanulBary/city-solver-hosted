import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { Routes,Route } from 'react-router-dom'
import Home from './Home.jsx'
import MapPage from './Map.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
      <Routes>
          <Route path='/' element={<App/>}/>
          <Route path='/home' element={<Home/>}/>
          <Route path='/objection' element={<MapPage/>}/>
      </Routes>
  </BrowserRouter>
)
