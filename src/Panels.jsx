import { useEffect, useState } from 'react'
import { formatRemaining, normalizeSite } from './utils.js'

const PRESETS = [15, 25, 60,]; //timer lengths in minutes

export function TimerPanel() {

  const [session, setSession] = useState(null); //copy of the session saved in storage
  const [now, setNow] = useState(0); //current time, for the countdown
  const [error, setError] = useState('');

  useEffect(() => { //used AI help (clarified the use of useEffect and setInterval properly)
    async function update() { //copies the session and the current time into state
      const { session } = await browser.storage.local.get('session');
      setSession(session); //null in the start
      setNow(Date.now()); //latest time
    }

    update(); //when the popup opens
    const id = setInterval(update, 1000); //every second, so the countdown moves
    browser.storage.onChanged.addListener(update); //bg.js updates session

    return () => { //when the popup closes
      clearInterval(id);
      browser.storage.onChanged.removeListener(update);
    };
  }, []);

  async function handleStart(minutes) {
    const { sites = [] } = await browser.storage.local.get('sites');
    if (sites.length === 0) { //nothing to block yet
      setError('Add a site in Blocked Sites first.');
      return;
    }
    setError('');

    browser.runtime.sendMessage({ type: 'start', minutes }); //background.js starts the session
  }

  let content;
  if (!session) { //no session: pick a length to start
    content = (
      <div className="preset-list">
        {PRESETS.map((preset) => (
          <button key={preset} type="button" className="preset-btn" onClick={() => handleStart(preset)}>
            {preset} min
          </button>
        ))}
      </div>
    )
  } else if (session.paused) { //paused: countdown paused
    content = (
      <div className="timer-running paused">
        <p className="timer-countdown">{formatRemaining(session.remainingTime)}</p>
        <p className="timer-label">Paused, sites stay blocked</p>
        <div className="timer-controls">
          <button type="button" className="timer-btn" onClick={() => browser.runtime.sendMessage({ type: 'resume' })}>
            Resume</button>
          <button type="button" className="timer-btn" onClick={() => browser.runtime.sendMessage({ type: 'stop' })}>
            Stop</button>
        </div>
      </div>
    )
  } else { //running: counting down
    content = (
      <div className="timer-running">
        <p className="timer-countdown">{formatRemaining(session.endTime - now)}</p>
        <p className="timer-label">until your sites unblock</p>
        <div className="timer-controls">
          <button type="button" className="timer-btn" onClick={() => browser.runtime.sendMessage({ type: 'pause' })}>
            Pause</button>
          <button type="button" className="timer-btn" onClick={() => browser.runtime.sendMessage({ type: 'stop' })}>
            Stop</button>
        </div>
      </div>
    )
  }

  return (
    <section className="tab-panel timer-panel">
      <h2 className="panel-title">{session ? 'Locked in' : 'Lock in for'}</h2>
      {content}
      {error && <p className="timer-error">{error}</p>}
    </section>
  )
}

export function BlockedPanel() {
  const [siteInput, setSiteInput] = useState('');
  const [blockedSites, setBlockedSites] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();

    const site = normalizeSite(siteInput); //turns the input into a proper url
    if (!site) return;

    
    const { sites = [] } = await browser.storage.local.get('sites'); //retrives the list of sites
    if (sites.includes(site)) return; //already in the list

    await browser.storage.local.set({ sites: [...sites, site] }); //adds new site

    setSiteInput('');
    await loadSites(); // refresh the list so the new site shows up
  }

  async function handleDelete(site) {
    const { sites = [] } = await browser.storage.local.get('sites');
    await browser.storage.local.set({ sites: sites.filter((s) => s !== site) });
    await loadSites(); // refresh the list so the deleted site disappears
  }

  async function loadSites() {
    const { sites = [] } = await browser.storage.local.get('sites');
    setBlockedSites(sites);
  }

  useEffect(() => {
    loadSites();
  }, []);

  return (
    <section className="tab-panel blocked-panel">
      <h2 className="panel-title">Blocked while you're locked in</h2>
      <form className="add-site-form" onSubmit={handleSubmit}>
        <input type="text" className="site-input" placeholder="e.g. youtube.com" value={siteInput}
          onChange={(e) => setSiteInput(e.target.value)} required />
        <button type="submit" className="add-site-btn">Add</button>
      </form>

      <ul className="site-list">
        {blockedSites.map((blockedSite) => (
          <li key={blockedSite} className="site-item">
            <span className="site-name">{blockedSite}</span>
            <button className="delete-site-btn" onClick={() => handleDelete(blockedSite)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
