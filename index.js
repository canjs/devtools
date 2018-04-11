// initialize the ViewModel sidebar
chrome.devtools.inspectedWindow.eval(
    "can",
    function(result, isException) {
        if (isException) {
            chrome.devtools.panels.create(
                "CanJS",
                "icons/canjs_logo_black.png",
                "panels/no-can-global-error.html"
            );
        } else {
            chrome.devtools.panels.elements.createSidebarPane("ViewModel",
                function initializeSidebar(sidebar) {
                    sidebar.setPage("sidebar/sidebar.html");
                }
            );

            chrome.devtools.panels.create(
                "CanJS",
                "icons/canjs_logo_black.png",
                "panels/main.html"
            );
        }
    }
);
