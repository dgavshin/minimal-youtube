// Toolbar tile only appears on YouTube tabs. On click, toggle enabled state
// in storage, swap the action icon to grayscale (or back to color), and reload
// the active YouTube tab so the content script re-runs against the new state.

const ICON = "assets/128x128.png";
const isYouTube = (url) => /^https:\/\/([a-z0-9-]+\.)*youtube\.com\//.test(url || "");

async function getIcon(grayscale) {
    const blob = await fetch(chrome.runtime.getURL(ICON)).then((r) => r.blob());
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    if (grayscale) {
        for (let i = 0; i < data.data.length; i += 4) {
            const avg = (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 3;
            data.data[i] = data.data[i + 1] = data.data[i + 2] = avg;
        }
    }
    return data;
}

async function syncIcon(tabId, enabled) {
    const data = await getIcon(!enabled);
    await chrome.action.setIcon({ tabId, imageData: data });
}

function syncTile(tabId, url) {
    chrome.action[isYouTube(url) ? "show" : "hide"](tabId);
}

chrome.tabs.onUpdated.addListener((tabId, change) => {
    if (change.url) syncTile(tabId, change.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !isYouTube(tab.url)) return;
    const { enabled = true } = await chrome.storage.local.get("enabled");
    syncIcon(tabId, enabled).catch(() => {});
});

chrome.action.onClicked.addListener(async (tab) => {
    const { enabled = true } = await chrome.storage.local.get("enabled");
    const next = !enabled;
    await chrome.storage.local.set({ enabled: next });
    await syncIcon(tab.id, next);
    chrome.tabs.reload(tab.id);
});