function initializeSidebar(name, location, page) {
    chrome.devtools.panels[location].createSidebarPane(name, function(sidebar) {
        sidebar.setPage(page);
    });
}

// initialize all the sidebars when devtools loads
initializeSidebar(
    "CanJS ViewModel",
    "elements",
    "viewmodel-editor/index.html"
);

initializeSidebar(
    "CanJS Bindings Graph",
    "elements",
    "bindings-graph/index.html"
);

initializeSidebar(
    "CanJS Queues Stack",
    "sources",
    "queues-stack/index.html"
);
