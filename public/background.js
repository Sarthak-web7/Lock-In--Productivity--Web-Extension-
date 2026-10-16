const ALARM_NAME = 'lockin-end';

async function startSession(minutes) {

  const endTime = Date.now() + minutes * 60000;  //converts to ms
  await browser.storage.local.set({ session: { endTime, minutes, paused: false } }); //sets the session

  const { sites = [] } = await browser.storage.local.get('sites'); 

  if (sites.length > 0) { //sites get blocked
    await browser.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
        id: 1,
        priority: 1,
        action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
        condition: {
          requestDomains: sites,
          resourceTypes: ['main_frame'],
        }
      }
    ]});
  }

  await browser.alarms.create(ALARM_NAME, { when: endTime }); //sets alarm to activate worker at the endtime
}

async function endSession() {
  await browser.storage.local.remove('session');
  await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] }); //unblocks sites
  await browser.alarms.clear(ALARM_NAME); //removes for next time
}

async function pauseSession() { //used AI help
  const { session } = await browser.storage.local.get('session');
  if (!session || session.paused) return; //nothing running to pause

  const remainingTime = session.endTime - Date.now(); //time left at the moment of pausing
  await browser.alarms.clear(ALARM_NAME); //no alarm while paused, so the session can't end
  await browser.storage.local.set({ session: { remainingTime, minutes: session.minutes, paused: true } }); //sites stay blocked
}

async function resumeSession() { //used AI help
  const { session } = await browser.storage.local.get('session');
  if (!session || !session.paused) return; //nothing paused to resume

  const endTime = Date.now() + session.remainingTime; //new end time from the time that was left
  await browser.storage.local.set({ session: { endTime, minutes: session.minutes, paused: false } });
  await browser.alarms.create(ALARM_NAME, { when: endTime });
}


chrome.runtime.onInstalled.addListener(() => { //default on install
  browser.storage.local.set({sites: []})
  browser.storage.local.set({session: null})
});

chrome.runtime.onMessage.addListener(async (message) => { //Timerpanel sends message
  if (message.type === 'start') {
    await startSession(message.minutes);
  }
  if (message.type === 'pause') {
    await pauseSession();
  }
  if (message.type === 'resume') {
    await resumeSession();
  }
  if (message.type === 'stop') {
    await endSession();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => { //when alarm goes off
  if (alarm.name === ALARM_NAME) {
    endSession();
  }
});