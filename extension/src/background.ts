export {};
declare const chrome: {
  action: { onClicked: { addListener(listener: (tab: { id?: number, windowId?: number }) => void): void } };
  tabs: { 
    sendMessage(tabId: number, message: unknown): Promise<void>;
    captureVisibleTab(windowId?: number, options?: { format: "png" | "jpeg", quality?: number }): Promise<string>;
  };
  runtime: {
    onMessage: { addListener(listener: (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void): void }
  };
};

chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) void chrome.tabs.sendMessage(tab.id, { type: "VEIL_RUN" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "VEIL_CAPTURE") {
    // Only capture the active tab's window
    chrome.tabs.captureVisibleTab(sender.tab?.windowId, { format: "png" })
      .then((dataUrl) => {
        // Return only the data URL to the content script, which will convert it to an in-memory ImageBitmap
        // Never log or store this
        sendResponse({ dataUrl });
      })
      .catch((err) => {
        sendResponse({ error: err instanceof Error ? err.message : String(err) });
      });
    return true; // Indicate async response
  }
});
