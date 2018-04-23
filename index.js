var ifGlobals = function(globals, cb) {
    var command = globals.map(function(global) {
        return "typeof " + global + " !== 'undefined'";
    }).join(" && ");

    chrome.devtools.inspectedWindow.eval(
        command,
        function(result, isException) {
            if (!isException && result) {
                cb();
            }
        }
    )
};

ifGlobals(
    [ "can", "can.Symbol", "can.viewModel", "can.Reflect" ],
    function() {
        chrome.devtools.panels.elements.createSidebarPane("CanJS ViewModel",
            function initializeSidebar(sidebar) {
                sidebar.setPage("viewmodel-editor/index.html");
            }
        );
    }
);

ifGlobals(
    [ "can", "can.queues", "can.Reflect" ],
    function() {
        // create can-queues stack sidebar
        chrome.devtools.panels.sources.createSidebarPane("CanJS Queues Stack",
            function initializeQueuesPanel(sidebar) {
                sidebar.setPage("queues-stack/index.html");
                sidebar.setHeight("50vh");
            }
        );
    }
);

ifGlobals(
    [ "can", "can.Symbol", "can.Reflect", "can.viewModel", "can.debug", "can.debug.formatGraph", "can.debug.getGraph" ],
    function() {
        // Add Bindings Graph sidebar
        chrome.devtools.panels.elements.createSidebarPane("CanJS Bindings Graph",
            function initializeQueuesPanel(sidebar) {
                sidebar.setPage("bindings-graph/index.html");
            }
        );
    }
);
