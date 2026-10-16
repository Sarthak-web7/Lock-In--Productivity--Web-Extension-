import { useEffect, useState } from 'react'
import { normalizeSite } from './utils.js'

export function TimerPanel() {
  return (
    <section className="tab-panel timer-panel">
      <h2 className="panel-title">Focus Timer</h2>
      {/* default timers go here */}
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

    
    const { sites = [] } = await chrome.storage.local.get('sites'); //retrives the list of sites
    if (sites.includes(site)) return; //already in the list

    await chrome.storage.local.set({ sites: [...sites, site] }); //adds new site

    setSiteInput('');
    await loadSites(); // refresh the list so the new site shows up
  }

  async function handleDelete(site) {
    const { sites = [] } = await chrome.storage.local.get('sites');
    await chrome.storage.local.set({ sites: sites.filter((s) => s !== site) });
    await loadSites(); // refresh the list so the deleted site disappears
  }

  async function loadSites() {
    const { sites = [] } = await chrome.storage.local.get('sites');
    setBlockedSites(sites);
  }

  useEffect(() => {
    loadSites();
  }, []);

  return (
    <section className="tab-panel blocked-panel">
      <h2 className="panel-title">Blocked Sites</h2>
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
