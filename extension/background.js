chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CAPTURE_OPEN_TABS") {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      const tabSummaries = [];
      for (const tab of tabs) {
        if (!tab.url || tab.url.startsWith("chrome://")) continue;
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body ? document.body.innerText.slice(0, 2500) : ""
          });
          tabSummaries.push({
            title: tab.title,
            url: tab.url,
            snippet: results?.[0]?.result || ""
          });
        } catch (err) {
          tabSummaries.push({
            title: tab.title,
            url: tab.url,
            snippet: "Content restricted by browser policy; using title & metadata."
          });
        }
      }
      sendResponse({ tabs: tabSummaries });
    });
    return true;
  }
});
