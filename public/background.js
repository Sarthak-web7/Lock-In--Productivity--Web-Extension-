// Background service worker: owns the focus session.
//
// Storage shape (chrome.storage.local):
//   sites:   string[]                              e.g. ["youtube.com", "reddit.com"]
//   session: { endTime: number, sites: string[] } | null

const ALARM_NAME = 'end-session';

// ---------- Blocking rules ----------

async function applyBlockRules(sites) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const rules = sites.map((site, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { extensionPath: `/blocked.html?site=${encodeURIComponent(site)}` },
    },
    // requestDomains also matches subdomains (www.youtube.com, m.youtube.com, ...)
    condition: { requestDomains: [site], resourceTypes: ['main_frame'] },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: rules,
  });
}

async function clearBlockRules() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
  });
}

function matchSite(url, sites) {
  try {
    const { hostname } = new URL(url);
    return sites.find((site) => hostname === site || hostname.endsWith(`.${site}`));
  } catch {
    return undefined;
  }
}

// Rules only apply to new page loads, so redirect tabs that are already open.
async function redirectOpenTabs(sites) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const site = tab.url && matchSite(tab.url, sites);
    if (site) {
      const url = chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(site)}`);
      chrome.tabs.update(tab.id, { url });
    }
  }
}

// ---------- Session lifecycle ----------

async function startSession(minutes) {
  const { sites = [] } = await chrome.storage.local.get('sites');
  if (sites.length === 0) throw new Error('Add at least one site to block.');
  if (!(minutes > 0)) throw new Error('Pick a duration longer than 0 minutes.');

  const session = { endTime: Date.now() + minutes * 60_000, sites };

  await applyBlockRules(sites);
  await chrome.storage.local.set({ session });
  await chrome.alarms.create(ALARM_NAME, { when: session.endTime });
  await redirectOpenTabs(sites);

  return session;
}

async function endSession({ notify }) {
  await clearBlockRules();
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.storage.local.set({ session: null });

  if (notify) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.jpg',
      title: 'Session complete',
      message: 'Nice work, you stayed locked in. Your sites are unblocked.',
    });
  }
}

// Make storage, rules and alarm agree after a browser restart or extension update.
async function reconcile() {
  const { session } = await chrome.storage.local.get('session');

  if (!session) {
    await clearBlockRules();
    return;
  }
  if (session.endTime <= Date.now()) {
    await endSession({ notify: true });
    return;
  }

  await applyBlockRules(session.sites);
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm) await chrome.alarms.create(ALARM_NAME, { when: session.endTime });
}

// ---------- Listeners ----------

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) endSession({ notify: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'start') {
    startSession(message.minutes)
      .then((session) => sendResponse({ ok: true, session }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true; // keep the channel open for the async response
  }
  return false;
});

chrome.runtime.onInstalled.addListener(reconcile);
chrome.runtime.onStartup.addListener(reconcile);
