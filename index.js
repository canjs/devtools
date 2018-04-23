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

var displayedSidebars = {};

var initializeSidebar = function(name, globals, location, indexPage, errorPage) {
    ifGlobals(globals, function(globalsExist) {
        // if the sidebar was already created, set it to the correct page
        // if it was not created, only create it if on a page with the `can` globals
        var existingSidebar = displayedSidebars[name]
        if (existingSidebar) {
            existingSidebar.setPage(globalsExist ? indexPage : errorPage);
        } else {
            if (globalsExist) {
                chrome.devtools.panels[location].createSidebarPane(name, function(sidebar) {
                    sidebar.setPage(indexPage);

                    // store sidebar so the page can be updated if the user navigates to a page without the required globals
                    displayedSidebars[name] = sidebar;
                });
            }
        }
    })
};

var initialize = function() {
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
};

// initialize the sidebar panels
initialize();

// if user navigates to a new page, reload devtools sidebars
// so that data loaded in `connectedCallback`s will be refreshed
// and the sidebars will be correctly enabled/disabled based on `can` global
chrome.devtools.network.onNavigated.addListener(function() {
    // wait for new page to (hopefully) load before re-initializing panels
    setTimeout(initialize, 2000);
});
