// Toolbar tile only appears on YouTube tabs. On click, toggle enabled state
// in storage, flip the OFF badge, and reload the active YouTube tab so the
// content script re-runs against the new state.

const isYouTube = (url) => /^https:\/\/([a-z0-9-]+\.)*youtube\.com\//.test(url || "");

function syncTile(tabId, url) {
    chrome.action[isYouTube(url) ? "show" : "hide"](tabId);
}

chrome.tabs.onUpdated.addListener((tabId, change) => {
    if (change.url) syncTile(tabId, change.url);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId).then((t) => syncTile(tabId, t.url)).catch(() => {});
});

chrome.action.onClicked.addListener(async (tab) => {
    const { enabled = true } = await chrome.storage.local.get("enabled");
    const next = !enabled;
    await chrome.storage.local.set({ enabled: next });
    chrome.action.setBadgeText({ tabId: tab.id, text: next ? "" : "OFF" });
    chrome.tabs.reload(tab.id);
});