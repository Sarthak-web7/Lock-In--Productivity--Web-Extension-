import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import Blocked from './Blocked.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Blocked />
  </StrictMode>,
)
