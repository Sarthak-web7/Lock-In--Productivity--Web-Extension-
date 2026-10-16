# Lock In: Productivity

#### [Video Demo Link (Click me)](https://youtu.be/M0Ys1OB9nXA)

Lock In is a Chrome extension that blocks distracting websites for a set amount of time and locks you in. You make a list of the sites that eat your day, pick 15, 25 or 60 minutes, and those sites stop loading until the timer runs out. Try to open one anyway and you get a page asking if you can't even focus.

There's no account to make and nothing leaves your browser. Your list and your session live in Chrome's local storage, and Chrome does the blocking itself.

## Features

- Block any site by typing its domain. You can paste a full link like `https://www.YouTube.com/watch?v=...` and Lock In trims it down to `youtube.com`.
- Blocking a domain covers its subdomains too, so `youtube.com` takes `m.youtube.com` down with it.
- Three session lengths: 15, 25 and 60 minutes.
- A live countdown in the popup. Close it, come back ten minutes later, and the number is still right.
- Pause and resume. Your sites stay blocked while you're paused.
- A blocked page with a sarcastic message, in case you forget why Reddit won't load.

## How to use

### Installing it

To run Lock In from source you build it and load it into Chrome yourself. You'll need Node.js and Chrome 148 or newer, since the manifest sets that as the minimum version.

1. Clone the repo and install the dependencies:
   ```
   npm install
   ```
2. Build it:
   ```
   npm run build
   ```
   Vite puts the finished extension in a `dist` folder.
3. Go to `chrome://extensions` and turn on **Developer mode** in the top right corner.
4. Click **Load unpacked** and pick the `dist` folder. Pick `dist` and not the project folder, because Chrome can't run the raw JSX files.

Chrome will warn you that the extension can "read and change all your data on all websites." The [Permissions](#permissions) section explains where that comes from.

### Using it

1. Click the Lock In icon in the toolbar. If you don't see it, pin it from the puzzle piece menu so you don't have to dig for it every time.
2. Open the **Blocked Sites** tab, type a site like `youtube.com` and hit **Add**. Add as many as you want. The **Delete** button next to each one takes it off the list.
3. Switch to the **Timer** tab and click 15, 25 or 60 min. The session starts right away and the popup flips to a countdown.
4. Get to work. Any blocked site you open or reload now sends you to the blocked page until the countdown hits zero.

If your list is empty, the Timer tab won't start and tells you to add a site first. A session with nothing to block would be a plain timer, and your phone already has one of those.

During a session you get two buttons, **Pause** and **Stop**. Pause freezes the countdown and leaves everything blocked. **Resume** picks up from the exact second you paused. Stop ends the session and unblocks everything on the spot.

## How it works

The popup and the background script don't share any variables. They talk in two ways: the popup sends messages, and both sides read and write `browser.storage.local`.

Adding a site never involves the background script. The Blocked Sites tab writes the list into storage under the key `sites`, and that's the end of it until you start a session.

Clicking a preset makes the Timer tab send a `start` message with the number of minutes. `startSession()` in `background.js` works out the end time (now plus the minutes in milliseconds) and saves it in storage as `session`. Then it reads the site list and adds a single `declarativeNetRequest` dynamic rule that redirects any top level page load on those domains to `blocked.html`. Last, it sets a Chrome alarm for the end time.

Once the alarm fires, Chrome wakes the service worker up if it was asleep and `endSession()` cleans up. It deletes the session, removes the rule and clears the alarm.

Pause and resume swap the session between two shapes. A running session stores `endTime`. A paused one stores `remainingTime` instead and has no alarm, so nothing can end it while it sits there. Resume adds the remaining time to the current time, saves that as a new `endTime` and sets a new alarm.

The popup keeps no time of its own. Once a second, and any time storage changes, the Timer tab reads `session` and subtracts the current time from `endTime`. `formatRemaining()` in `utils.js` turns that into `mm:ss`, or `h:mm:ss` for anything an hour or longer. That's why a 60 minute session shows `1:00:00` for a split second before it drops to `59:59`.

## Design choices

**An end time instead of a running countdown.** The popup closes the moment you click away from it, and Chrome shuts down an idle service worker after about 30 seconds. A `setInterval` counting down would die with either one. Saving the end time turns the countdown into a subtraction, and a subtraction gives the right answer whenever you open the popup.

**Alarms instead of `setTimeout`.** Same problem on the background side. A `setTimeout` dies with the service worker. A `chrome.alarms` alarm outlives the worker and starts it back up when it's due.

**declarativeNetRequest instead of watching tabs.** Chrome applies the rule on its own before the page loads. The extension never has to look at your browsing or inject a script into anyone's page. The whole list fits in one rule with ID `1`, because `requestDomains` takes an array, so ending a session means removing one ID. The rule matches `main_frame` requests only, which are pages you open in a tab. A YouTube video embedded in some blog will still play.

**Pause keeps your sites blocked.** If pausing unblocked things, Pause would be a slower Stop button. The label under a paused countdown says "Paused, sites stay blocked" so you don't have to guess.

**Cleaning up what you type.** You'll probably paste whatever's in the address bar. `normalizeSite()` lowercases it, adds `https://` if there's no scheme, hands it to the browser's `URL` parser to pull out the hostname, and strips a leading `www.`. It rejects anything without a dot in the middle, so `localhost` or a stray word can't get into the list. The Blocked Sites tab also skips a site that's already there.

**`background.js` lives in `public/`.** Vite copies everything in `public/` into `dist/` without bundling it. That keeps the service worker as a plain file called `background.js`, which is the name `manifest.json` points to, instead of a hashed bundle. The manifest and the icons sit in `public/` for the same reason.

**Two HTML entry points.** `vite.config.js` lists `index.html` (the popup) and `blocked.html` (the blocked page) as separate inputs. The build spits out two pages that share React and the same base CSS.

## Permissions

- **`declarativeNetRequest`** adds and removes the blocking rule.
- **`alarms`** ends the session on time, even after the service worker has gone to sleep.
- **`storage`** holds your site list and the current session.
- **Host access to `<all_urls>`.** Chrome only lets an extension redirect a request if it has host access to that site. You can block any site you want, so Lock In asks for all of them. This one triggers the install warning.

The manifest also lists `blocked.html` under `web_accessible_resources`. Without that, Chrome wouldn't let a tab that was loading a normal website open the extension's page after the redirect.

## Tech Stack

- React 19 for the popup and the blocked page
- Vite 8 to build both pages into one extension
- Plain CSS with a small set of custom properties for the dark theme
- Chrome's Manifest V3 APIs: `declarativeNetRequest`, `alarms`, `storage` and runtime messaging
- ESLint, set up with the `webextensions` globals so it doesn't flag `browser` and `chrome` as undefined

## Project Folder

### `public/`: the extension core

**`manifest.json`** describes the extension to Chrome. It's Manifest V3, with the popup at `index.html`, the service worker at `background.js` running as a module, the three permissions, host access, the icons and a minimum Chrome version of 148.

**`background.js`** is the service worker and the only file that blocks anything. It has four functions: `startSession`, `endSession`, `pauseSession` and `resumeSession`. A message listener maps the popup's `start`, `pause`, `resume` and `stop` messages onto those functions, and an alarm listener calls `endSession` when time's up. On install it seeds storage with an empty site list and no session.

**`icons/`** has the extension icon at 16, 32, 48 and 128 pixels. The popup header and the blocked page reuse them.

### `index.html` and `src/`: the popup

**`index.html`** and **`src/main.jsx`** mount the `App` component into the popup.

**`App.jsx`** is the popup shell. It draws the header and the two tab buttons, remembers which tab is open and renders the matching panel. It opens on Timer.

**`Panels.jsx`** holds both tabs.

- `TimerPanel` reads the session from storage once a second and also listens for storage changes, so it updates when the background script ends a session. It shows one of three views. With no session you get the three preset buttons. A running session shows a big countdown with Pause and Stop. A paused session shows a greyed out countdown with Resume and Stop.
- `BlockedPanel` is a form on top of a list. It reads and writes `sites` in storage straight from the popup and never messages the background script.

**`utils.js`** has two helpers. `normalizeSite()` turns whatever you typed into a bare domain, or returns `null` if it can't. `formatRemaining()` turns milliseconds into a countdown string and never shows anything below `00:00`.

**`index.css`** has the base styles and color variables: a dark grey background, light text and one red that shows up on errors and when you hover Stop or Delete. Both pages import it. The font stack starts with Segoe UI Variable and falls back to your system font.

**`App.css`** lays out the 320px wide popup, the preset tiles, the large countdown digits and the site list. The "No sites yet" message you see on an empty list comes from a CSS `::before` rule, not from React.

### `blocked.html` and `src/blocked/`: the blocked page

**`blocked.html`** and **`src/blocked/main.jsx`** use the same setup as the popup, pointed at a different component.

**`Blocked.jsx`** is the page you land on when you try to open a blocked site. It shows the icon, the headline "Blocked, can't even focus? lol" and a line telling you the site stays blocked until your lock-in ends.

**`Blocked.css`** puts the message in a narrow column near the top of the page and makes the headline big enough that you feel judged.

### Config

**`vite.config.js`** loads the React plugin and lists the two HTML inputs.

**`eslint.config.js`** turns on the recommended JavaScript rules, the React Hooks rules and the browser and web extension globals.

## Known limitations

- Editing the list doesn't affect a session that's already running. `startSession()` copies the list into the rule when the session starts. A site you add mid-session stays open until next time, and a site you delete stays blocked until the timer ends.
- A tab that already had a blocked site open before you started stays put. The redirect only happens on the next full page load. YouTube switches videos without a full page load, so you can keep clicking around in that tab until you reload it.
- Reloading the extension from `chrome://extensions` wipes your list. The `onInstalled` listener resets storage, and Chrome fires that event on reloads and updates as well as on first install.
- Chrome doesn't promise to keep alarms across a browser restart. If you quit Chrome mid-session and come back to a countdown stuck at `00:00` with your sites still blocked, click **Stop**.
- Stop works the second you click it, no questions asked. Lock In trusts you to leave it alone.
- You can't set a custom length yet. It's 15, 25 or 60 minutes.

## Development notes

`npm run dev` starts Vite's dev server, but the popup breaks in a normal browser tab as soon as it calls `browser.storage`, which only exists inside an extension. To test a change, run `npm run build` and click the reload arrow on Lock In's card in `chrome://extensions`. Reloading clears your block list, so keep a couple of test sites in mind to add back.

`npm run lint` runs ESLint over the project.
