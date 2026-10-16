import { useEffect, useState } from 'react'
import { formatRemaining, normalizeSite } from './utils.js'
import './App.css'

const PRESETS = [15, 25, 50]

function App() {
  const [sites, setSites] = useState([])
  const [session, setSession] = useState(null)
  const [draft, setDraft] = useState('')
  const [minutes, setMinutes] = useState(25)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // Load saved state and stay in sync with the background script.
  useEffect(() => {
    chrome.storage.local.get(['sites', 'session']).then((data) => {
      setSites(data.sites ?? [])
      setSession(data.session ?? null)
    })

    const onChanged = (changes, area) => {
      if (area !== 'local') return
      if (changes.sites) setSites(changes.sites.newValue ?? [])
      if (changes.session) setSession(changes.session.newValue ?? null)
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  // Tick once a second while a session is running.
  useEffect(() => {
    if (!session) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [session])

  const isActive = session !== null && session.endTime > now

  function saveSites(next) {
    setSites(next)
    chrome.storage.local.set({ sites: next })
  }

  function addSite(event) {
    event.preventDefault()
    const site = normalizeSite(draft)
    if (!site) {
      setError('Enter a website like youtube.com')
      return
    }
    if (sites.includes(site)) {
      setError(`${site} is already on your list`)
      return
    }
    saveSites([...sites, site])
    setDraft('')
    setError('')
  }

  function removeSite(site) {
    saveSites(sites.filter((s) => s !== site))
  }

  async function startSession() {
    setStarting(true)
    setError('')
    const response = await chrome.runtime.sendMessage({ type: 'start', minutes })
    setStarting(false)
    if (!response?.ok) {
      setError(response?.error ?? 'Could not start the session')
      return
    }
    setSession(response.session)
    setNow(Date.now())
  }

  if (isActive) {
    return (
      <main className="popup">
        <header className="header">
          <h1 className="title">Lock In</h1>
          <span className="badge badge--live">Session live</span>
        </header>

        <section className="countdown">
          <div className="countdown__time">{formatRemaining(session.endTime - now)}</div>
          <p className="muted">until your sites unblock</p>
        </section>

        <section>
          <h2 className="label">Blocking {session.sites.length} {session.sites.length === 1 ? 'site' : 'sites'}</h2>
          <ul className="chips">
            {session.sites.map((site) => (
              <li key={site} className="chip">{site}</li>
            ))}
          </ul>
        </section>

        <p className="footnote">No early exits. Stay locked in.</p>
      </main>
    )
  }

  return (
    <main className="popup">
      <header className="header">
        <h1 className="title">Lock In</h1>
        <span className="badge">Ready</span>
      </header>

      <section>
        <h2 className="label">Sites to block</h2>
        <form className="add" onSubmit={addSite}>
          <input
            className="input"
            type="text"
            placeholder="youtube.com"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Website to block"
          />
          <button className="button button--ghost" type="submit">Add</button>
        </form>

        {sites.length === 0 ? (
          <p className="empty">No sites yet. Add the ones that distract you.</p>
        ) : (
          <ul className="list">
            {sites.map((site) => (
              <li key={site} className="list__item">
                <span>{site}</span>
                <button
                  className="remove"
                  type="button"
                  onClick={() => removeSite(site)}
                  aria-label={`Remove ${site}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="label">Duration</h2>
        <div className="durations">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`pill ${minutes === preset ? 'pill--active' : ''}`}
              onClick={() => setMinutes(preset)}
            >
              {preset}m
            </button>
          ))}
          <label className="custom">
            <input
              className="input input--small"
              type="number"
              min="1"
              max="600"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              aria-label="Custom minutes"
            />
            <span className="muted">min</span>
          </label>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <button
        className="button button--primary"
        type="button"
        onClick={startSession}
        disabled={starting || sites.length === 0 || !(minutes > 0)}
      >
        {starting ? 'Starting…' : `Lock in for ${minutes || 0} min`}
      </button>
    </main>
  )
}

export default App
