declare const chrome: {
  action: { onClicked: { addListener(listener: (tab: { id?: number }) => void): void } };
  tabs: { sendMessage(tabId: number, message: unknown): Promise<void> };
};

chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) void chrome.tabs.sendMessage(tab.id, { type: "VEIL_RUN" });
});
