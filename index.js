function initializeSidebar(name, location, page) {
    chrome.devtools.panels[location].createSidebarPane(name, function(sidebar) {
        sidebar.setPage(page);
    });
}

(function initializeDevtools() {
    var registeredFrames = window.CANJS_DEVTOOLS_HELPERS.registeredFrames;
    var frameURLs = Object.keys(registeredFrames);

    if (frameURLs.length) {
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
    } else {
        // popup and icon are default to the `no-can` version,
        // so don't need to be set here
        setTimeout(initializeDevtools, 1000);
    }
}());
