export {};
declare const chrome: {
  action: { onClicked: { addListener(listener: (tab: { id?: number, windowId?: number }) => void): void } };
  tabs: { 
    sendMessage(tabId: number, message: unknown): Promise<void>;
    captureVisibleTab(windowId?: number, options?: { format: "png" | "jpeg", quality?: number }): Promise<string>;
    create(createProperties: { url?: string, active?: boolean }): Promise<{ id?: number }>;
    query(queryInfo: { windowType?: string, active?: boolean, currentWindow?: boolean }): Promise<Array<{ id?: number, url?: string }>>;
  };
  runtime: {
    id: string;
    getURL(path: string): string;
    onMessage: { addListener(listener: (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void): void }
  };
};

const pendingConfirmations = new Map<string, { resolve: (response: any) => void, action: any }>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "VEIL_GET_PENDING_ACTION") {
    if (pendingConfirmations.size > 0) {
      const actionId = pendingConfirmations.keys().next().value as string;
      const { action } = pendingConfirmations.get(actionId)!;
      sendResponse({ actionId, action });
    } else {
      sendResponse(null);
    }
    return;
  }

  if (message && message.type === "VEIL_CAPTURE") {
    // Only capture the active tab's window
    chrome.tabs.captureVisibleTab(sender.tab?.windowId, { format: "png" })
      .then((dataUrl) => {
        sendResponse({ dataUrl });
      })
      .catch((err) => {
        sendResponse({ error: err instanceof Error ? err.message : String(err) });
      });
    return true; // Indicate async response
  }

  if (message && message.type === "VEIL_REQUIRE_CONFIRMATION") {
    // Store the sendResponse callback and action
    pendingConfirmations.set(message.actionId, { resolve: sendResponse, action: message.action });

    // Notify UI that authorization is pending
    if (sender.tab?.id !== undefined) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "VEIL_STATE_UPDATE",
        payload: "Awaiting authorization",
        progress: 0,
        isWarning: true,
        awaitingAuth: true
      });
    }

    // Automatically open the dashboard if we need confirmation
    chrome.tabs.create({ url: chrome.runtime.getURL("dist/frontend/index.html"), active: true });
    
    // Return true to keep the message channel open for the async response
    return true;
  }

  if (message && message.type === "VEIL_CONFIRM_ACTION") {
    const entry = pendingConfirmations.get(message.actionId);
    if (entry) {
      entry.resolve({ allow: message.allow });
      pendingConfirmations.delete(message.actionId);
    }
  }

  if (message && message.type === "VEIL_TRIGGER_FROM_DASHBOARD") {
    // Find a tab to run the action on, prioritizing localhost tabs
    chrome.tabs.query({ windowType: "normal" }).then(tabs => {
      const targetTab = tabs.find(t => t.url?.includes("127.0.0.1:8000") || t.url?.includes("localhost:8000")) 
                     || tabs.find(t => !t.url?.includes((chrome.runtime as any).id));
      if (targetTab?.id !== undefined) {
        chrome.tabs.sendMessage(targetTab.id, { type: "VEIL_RUN" });
      }
    });
  }
});
