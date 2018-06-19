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

        // set the icon to the blue CanJS logo when the page is using CanJS
        for (var i=0; i<frameURLs.length; i++) {
            chrome.browserAction.setPopup({
                tabId: registeredFrames[ frameURLs[i] ].tabId,
                popup: "popups/can.html"
            });

            chrome.browserAction.setIcon({
                tabId: registeredFrames[ frameURLs[i] ].tabId,
                path: {
                    "16": "images/canjs-16-enabled.png"
                }
            });
        }
    } else {
        // popup and icon are default to the `no-can` version,
        // so don't need to be set here
        setTimeout(initializeDevtools, 1000);
    }
}());
