// Provide a shim for cross-browser support
const api = typeof browser !== "undefined" ? browser : chrome;

// Handle tab switching
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) tab.classList.add('active');
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // Wire tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            if (tabId) switchTab(tabId);
        });
    });

    // Wire dialog close
    const btnDialogClose = document.getElementById('btn-dialog-close');
    if (btnDialogClose) {
        btnDialogClose.addEventListener('click', closeDialog);
    }

    // Check for pending actions
    checkPendingAction();
});

async function checkPendingAction() {
    try {
        const res = await api.runtime.sendMessage({ type: "VEIL_GET_PENDING_ACTION" });
        if (res && res.action) {
            const dialogContent = document.querySelector('.dialog-content p');
            dialogContent.innerHTML = `Server proposes: <strong>${res.action.actionType} '${res.action.selector || ''}'</strong>.<br>This requires user confirmation.`;
            showDialog();
            
            const allowBtn = document.getElementById('btn-dialog-allow');
            const denyBtn = document.getElementById('btn-dialog-deny');
            
            const cleanup = () => {
                allowBtn.replaceWith(allowBtn.cloneNode(true));
                denyBtn.replaceWith(denyBtn.cloneNode(true));
                closeDialog();
            };

            allowBtn.addEventListener('click', () => {
                api.runtime.sendMessage({ type: "VEIL_CONFIRM_ACTION", allow: true, actionId: res.actionId });
                cleanup();
            }, { once: true });

            denyBtn.addEventListener('click', () => {
                api.runtime.sendMessage({ type: "VEIL_CONFIRM_ACTION", allow: false, actionId: res.actionId });
                cleanup();
            }, { once: true });
        }
    } catch (e) {
        console.warn("Failed to check pending action", e);
    }
}

function showDialog() {
    document.getElementById('action-dialog').classList.remove('hidden');
}

function closeDialog() {
    document.getElementById('action-dialog').classList.add('hidden');
}

let isDragging = false;
let currentWindow = null;
let offsetX = 0;
let offsetY = 0;

document.querySelectorAll('.title-bar').forEach(bar => {
    bar.addEventListener('mousedown', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        isDragging = true;
        currentWindow = bar.parentElement;
        offsetX = e.clientX - currentWindow.getBoundingClientRect().left;
        offsetY = e.clientY - currentWindow.getBoundingClientRect().top;
    });
});

document.addEventListener('mousemove', (e) => {
    if (isDragging && currentWindow) {
        currentWindow.style.left = (e.clientX - offsetX) + 'px';
        currentWindow.style.top = (e.clientY - offsetY) + 'px';
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    currentWindow = null;
});

// Live State Wiring
function addLog(message, isWarning = false) {
    const ul = document.querySelector('.tree-view');
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    if (isWarning) {
        li.innerHTML = `[${time}] <span class="warning">${message}</span>`;
    } else {
        li.textContent = `[${time}] ${message}`;
    }
    ul.appendChild(li);
    // Auto-scroll
    ul.parentElement.scrollTop = ul.parentElement.scrollHeight;
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "VEIL_STATE_UPDATE") {
        addLog(message.payload, message.isWarning);
        if (message.progress !== undefined) {
            const fill = document.querySelector('.progress-fill');
            if (fill) fill.style.width = message.progress + '%';
        }
        
        if (message.sessionStatus) {
            const statusText = document.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = message.sessionStatus;
                statusText.className = 'status-text ' + (message.sessionStatus === 'ACTIVE' ? 'green' : '');
            }
            const statusBarField = document.querySelector('.status-bar-field');
            if (statusBarField) {
                statusBarField.textContent = 'Status: ' + (message.sessionStatus === 'ACTIVE' ? 'Running...' : 'Ready');
            }
        }

        if (message.observer !== undefined) {
            const obs = document.getElementById('checkbox-observer');
            if (obs) obs.checked = message.observer;
        }
        if (message.fallback !== undefined) {
            const fb = document.getElementById('checkbox-fallback');
            if (fb) fb.checked = message.fallback;
        }
        
        if (message.gatePassed !== undefined) {
            const gv = document.getElementById('gate-verified');
            const gb = document.getElementById('gate-blocked');
            if (gv) gv.checked = message.gatePassed;
            if (gb) gb.checked = !message.gatePassed;
        }
    } else if (message.type === "VEIL_REQUIRE_CONFIRMATION") {
        const dialogContent = document.querySelector('.dialog-content p');
        dialogContent.innerHTML = `Server proposes: <strong>${message.action.actionType} '${message.action.selector}'</strong>.<br>This requires user confirmation.`;
        showDialog();
        
        // Setup one-time handlers
        const allowBtn = document.getElementById('btn-dialog-allow');
        const denyBtn = document.getElementById('btn-dialog-deny');
        
        const cleanup = () => {
            allowBtn.replaceWith(allowBtn.cloneNode(true));
            denyBtn.replaceWith(denyBtn.cloneNode(true));
            closeDialog();
        };

        allowBtn.addEventListener('click', () => {
            api.runtime.sendMessage({ type: "VEIL_CONFIRM_ACTION", allow: true, actionId: message.actionId });
            cleanup();
        }, { once: true });

        denyBtn.addEventListener('click', () => {
            api.runtime.sendMessage({ type: "VEIL_CONFIRM_ACTION", allow: false, actionId: message.actionId });
            cleanup();
        }, { once: true });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const authorizeBtn = document.getElementById('btn-authorize');
    if (authorizeBtn) {
        authorizeBtn.addEventListener('click', async () => {
            try {
                // To run VEIL from the dashboard, we need to send a message to the background script
                // to find the last active non-dashboard tab and run VEIL on it.
                // Or just broadcast VEIL_RUN and let the background route it.
                // Since this is a dashboard tab, the background needs to query tabs.
                api.runtime.sendMessage({ type: "VEIL_TRIGGER_FROM_DASHBOARD" });
            } catch (e) {
                console.error(e);
            }
        });
    }

    const cancelBtn = document.getElementById('btn-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.close();
        });
    }

    // Wire settings
    const maskPwd = document.getElementById('mask-pwd');
    const maskPii = document.getElementById('mask-pii');
    const blurFace = document.getElementById('blur-face');

    if (api.storage && api.storage.local) {
        api.storage.local.get(['maskPasswords', 'maskPii', 'blurFaces']).then(storage => {
            if (maskPwd) maskPwd.checked = storage.maskPasswords !== false;
            if (maskPii) maskPii.checked = storage.maskPii !== false;
            if (blurFace) blurFace.checked = storage.blurFaces !== false;
        });

        const saveSettings = () => {
            api.storage.local.set({
                maskPasswords: maskPwd ? maskPwd.checked : true,
                maskPii: maskPii ? maskPii.checked : true,
                blurFaces: blurFace ? blurFace.checked : true
            });
        };

        if (maskPwd) maskPwd.addEventListener('change', saveSettings);
        if (maskPii) maskPii.addEventListener('change', saveSettings);
        if (blurFace) blurFace.addEventListener('change', saveSettings);
    }
});
