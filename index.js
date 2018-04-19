// only add CanJS DevTools sidebars if `window.can` is available in the user's page
chrome.devtools.inspectedWindow.eval(
    "can",
    function(result, isException) {
        if (!isException) {
            // create ViewModel Editor sidebar
            chrome.devtools.panels.elements.createSidebarPane("CanJS ViewModel",
                function initializeSidebar(sidebar) {
                    sidebar.setPage("viewmodel-editor/index.html");
                }
            );

            // create can-queues stack sidebar
			chrome.devtools.panels.sources.createSidebarPane("CanJS Queues Stack",
                function initializeQueuesPanel(sidebar) {
                    sidebar.setPage("queues-stack/index.html");
                    sidebar.setHeight("50vh");
                }
            );

            // check that can-debug functions are available
            chrome.devtools.inspectedWindow.eval(
                "can.debug.getGraph && can.debug.formatGraph",
                function(result, isException) {
                    if (!isException) {
                        // Add Bindings Graph sidebar
                        chrome.devtools.panels.elements.createSidebarPane("CanJS Bindings Graph",
                            function initializeQueuesPanel(sidebar) {
                                sidebar.setPage("bindings-graph/index.html");
                            }
                        );
                    }
                }
            );
        }
    }
);
