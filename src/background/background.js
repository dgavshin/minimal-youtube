// Toggles the extension on/off when the toolbar icon is clicked.
// On YouTube, also reloads the active tab so content.js re-runs with the new state.
// On non-YouTube pages, just flips storage — the badge follows on the next YT tab.

chrome.action.onClicked.addListener(async (tab) => {
    const { enabled = true } = await chrome.storage.local.get("enabled");
    const next = !enabled;
    await chrome.storage.local.set({ enabled: next });

    if (tab?.id && tab.url?.includes("youtube.com")) {
        chrome.action.setBadgeText({ tabId: tab.id, text: next ? "" : "OFF" });
        chrome.tabs.reload(tab.id);
    }
});