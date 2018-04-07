// inject the content script, which runs in the context of the user's page
chrome.tabs.executeScript(null, {
    file: "canjs-devtools.js"
});

// initialize the ViewModel sidebar
chrome.devtools.panels.elements.createSidebarPane("ViewModel", 
    function initializeSidebar(sidebar) {
        sidebar.setPage("sidebar/sidebar.html");
    }
);
