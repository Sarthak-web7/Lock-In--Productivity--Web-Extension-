export function TimerPanel() {
  return (
    <section className="tab-panel timer-panel">
      <h2 className="panel-title">Focus Timer</h2>
      {/* default timers go here */}
    </section>
  )
}

export function BlockedPanel() {
  return (
    <section className="tab-panel blocked-panel">
      <h2 className="panel-title">Blocked Sites</h2>

      <form className="add-site-form">
        <input type="text" className="site-input" placeholder="e.g. youtube.com" required />
        <button type="submit" className="add-site-btn">Add</button>
      </form>

      <ul className="site-list">
        {/* blocked sites go here */}
      </ul>
    </section>
  )
}
