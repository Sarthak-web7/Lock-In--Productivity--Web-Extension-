import { useEffect, useState } from 'react'
import { formatRemaining, normalizeSite } from './utils.js'
import { TimerPanel, BlockedPanel } from './Panels.jsx'
import './App.css'

function App() {
  //Claude helped in creating the html skeleton
  const [activeTab, setActiveTab] = useState('timer') //state for switching panels

  let panel;
  if (activeTab === 'timer') {
    panel = <TimerPanel />
  } else {
    panel = <BlockedPanel />
  }

  return (
    <div className="popup">
      <header className="popup-header">
        <h1 className="popup-title">Lock In</h1>
      </header>

      <nav className="tab-toggle">
        <button type="button" className="tab-btn" onClick={() => setActiveTab('timer')}>
          Timer</button>

        <button type="button" className="tab-btn" onClick={() => setActiveTab('blocklist')}>
          Blocked Sites</button>
      </nav>

      <main className="popup-content">{panel}</main>
    </div>
  )
}

export default App
