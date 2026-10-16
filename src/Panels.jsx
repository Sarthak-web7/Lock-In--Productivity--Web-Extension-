import { useState } from 'react'
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
  const [siteInput, setSiteInput] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    const site = normalizeSite(siteInput); //turns the input into a proper url
    if (!site) return
    const finalUrl = `||${site}`; //filters subdomains and any extended url with paths, etc.

    //check if already blocked
    const allFilteredSites = await chrome.declarativeNetRequest.getDynamicRules();
    for (const filteredSite of allFilteredSites) {
      if (filteredSite.condition.urlFilter === finalUrl) return;
    }

    // filters to find the next available ID
    const nextId = Math.max(0, ...allFilteredSites.map((filteredSite) => filteredSite.id)) + 1;

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: nextId,
          priority: 1,
          action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
          condition: { urlFilter: finalUrl, resourceTypes: ['main_frame'] },
        },
      ],
    })

  }

  return (
    <section className="tab-panel blocked-panel">
      <h2 className="panel-title">Blocked Sites</h2>

      <form className="add-site-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="site-input"
          placeholder="e.g. youtube.com"
          value={siteInput}
          onChange={(e) => setSiteInput(e.target.value)}
          required
        />
        <button type="submit" className="add-site-btn">Add</button>
      </form>

      <ul className="site-list">
        {/* blocked sites go here */}
      </ul>
    </section>
  )
}
