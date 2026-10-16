const ALARM_NAME = 'lockin-end';


async function startSession(minutes) {

  const endTime = Date.now() + minutes * 60000;
  await chrome.storage.local.set({ session: { endTime, minutes } });
  
}
// ---------- listeners (must stay at the top level) ----------

chrome.runtime.onInstalled.addListener(() => {
  // TODO: set default storage values
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // TODO: if message.type === 'start', call startSession(message.minutes)
  // TODO: if message.type === 'stop', call endSession()
});

chrome.alarms.onAlarm.addListener((alarm) => {
  // TODO: if alarm.name === ALARM_NAME, call endSession()
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  // Optional: if sites changed during a session, rebuild the rules
});
