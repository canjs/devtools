var ifGlobals = function(globals, cb) {
    var command = globals.map(function(global) {
        return "typeof " + global + " !== 'undefined'";
    }).join(" && ");

    chrome.devtools.inspectedWindow.eval(
        command,
        function(result, isException) {
            cb(!isException && result);
        }
    )
};

var sidebarCache = {};

var initializeSidebar = function(name, globals, location, indexPage, errorPage) {
    // if the sidebar was already created, set it to the correct page
    // if it was not created, only create it if on a page with the `can` globals
    ifGlobals(globals, function(globalsExist) {
        var cached = sidebarCache[name]

        if (cached) {
            var page = globalsExist ? indexPage : errorPage;

            // if the page that should be displayed changes, call setPage again
            if (cached.page !== page) {
                cached.page = page;
                cached.sidebar.setPage(page);
            }
        } else {
            if (globalsExist) {
                chrome.devtools.panels[location].createSidebarPane(name, function(sidebar) {
                    sidebar.setPage(indexPage);

                    // store sidebar so the page can be updated if the sidebar should no longer be shown
                    sidebarCache[name] = {
                        sidebar: sidebar,
                        page: indexPage
                    };
                });
            }
        }
    });
};

(function createSidebarsIfGlobalsExist() {
    initializeSidebar(
        "CanJS ViewModel",
        [ "can", "can.Symbol", "can.viewModel", "can.Reflect" ],
        "elements",
        "viewmodel-editor/index.html",
        "viewmodel-editor/error.html"
    );

    initializeSidebar(
        "CanJS Bindings Graph",
        [ "can", "can.Symbol", "can.Reflect", "can.viewModel", "can.debug", "can.debug.formatGraph", "can.debug.getGraph" ],
        "elements",
        "bindings-graph/index.html",
        "bindings-graph/error.html"
    );

    initializeSidebar(
        "CanJS Queues Stack",
        [ "can", "can.queues", "can.Reflect" ],
        "sources",
        // needs to have min-height of 50vh
        "queues-stack/index.html",
        "queues-stack/error.html"
    );

    setTimeout(createSidebarsIfGlobalsExist, 2000);
}());
