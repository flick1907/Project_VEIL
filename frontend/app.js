function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    
    // Add active class to clicked tab
    // We have to find the matching tab button based on the onclick text or parameter
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('onclick').includes(tabId)) {
            tab.classList.add('active');
        }
    });
}

function showDialog() {
    document.getElementById('action-dialog').classList.remove('hidden');
}

function closeDialog() {
    document.getElementById('action-dialog').classList.add('hidden');
}

// Draggable window logic
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
