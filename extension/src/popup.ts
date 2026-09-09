export {};
declare const chrome: any;
declare const browser: any;

const api = typeof browser !== "undefined" ? browser : chrome;

document.addEventListener("DOMContentLoaded", () => {
    const dashboardBtn = document.getElementById("open-dashboard");
    if (dashboardBtn) {
        dashboardBtn.addEventListener("click", () => {
            api.tabs.create({ url: api.runtime.getURL("dist/frontend/index.html") });
            window.close(); // Close the popup after clicking
        });
    }

    const runBtn = document.getElementById("run-veil");
    if (runBtn) {
        runBtn.addEventListener("click", async () => {
            try {
                const tabs = await api.tabs.query({ active: true, currentWindow: true });
                if (tabs.length > 0 && tabs[0].id !== undefined) {
                    // Open dashboard in the background so we can see the logs
                    await api.tabs.create({ url: api.runtime.getURL("dist/frontend/index.html"), active: false });
                    
                    // Give it a tiny delay to initialize listeners
                    setTimeout(() => {
                        api.tabs.sendMessage(tabs[0].id, { type: "VEIL_RUN" });
                    }, 500);
                }
            } catch (e) {
                console.error("Failed to run VEIL:", e);
            }
            window.close();
        });
    }
});
