// only add CanJS Devtools panel and sidebar if `window.can` is available in the user's page
chrome.devtools.inspectedWindow.eval(
    "can",
    function(result, isException) {
        if (!isException) {
            // create ViewModel panel
            chrome.devtools.panels.elements.createSidebarPane("CanJS ViewModel",
                function initializeSidebar(sidebar) {
                    sidebar.setPage("viewmodel-panel/index.html");
                }
            );

            // create can-queues.logStack panel
			chrome.devtools.panels.sources.createSidebarPane("CanJS Queues Stack",
                function initializeQueuesPanel(sidebar) {
                    sidebar.setPage("queues-panel/index.html");
                    sidebar.setHeight("50vh");
                }
            );

            // check that can-debug functions are available
            chrome.devtools.inspectedWindow.eval(
                "can.debug.getGraph && can.debug.formatGraph",
                function(result, isException) {
                    if (!isException) {
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
