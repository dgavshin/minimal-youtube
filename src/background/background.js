// Toolbar tile is shown only for YouTube tabs, and only because the content
// script tells us so (chrome.runtime.onMessage below). The background never
// reads tab.url — that triggers Safari's "would like to access <host>" prompt
// for every non-YouTube tab the user touches.
//
// On click, toggle enabled state in storage, swap the action icon to grayscale
// (or back to color), and reload the active YouTube tab so the content script
// re-runs against the new state.

const ICON = "assets/128x128.png";

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

chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg?.type === "minimal-yt-loaded" && sender.tab?.id != null) {
        chrome.action.show(sender.tab.id);
        chrome.storage.local.get("enabled", ({ enabled = true } = {}) => {
            syncIcon(sender.tab.id, enabled).catch(() => {});
        });
    }
    return false;
});

chrome.action.onClicked.addListener(async (tab) => {
    if (tab?.id == null) return;
    const { enabled = true } = await chrome.storage.local.get("enabled");
    const next = !enabled;
    await chrome.storage.local.set({ enabled: next });
    await syncIcon(tab.id, next);
    chrome.tabs.reload(tab.id);
});