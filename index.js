function initializeSidebar(name, location, page, height) {
    chrome.devtools.panels[location].createSidebarPane(name, function(sidebar) {
        sidebar.setPage(page);

        if(height) {
            sidebar.setHeight(height);
        }
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
            "queues-stack/index.html",
            "400px"
        );
    } else {
        // popup and icon are default to the `no-can` version,
        // so don't need to be set here
        setTimeout(initializeDevtools, 1000);
    }
}());
