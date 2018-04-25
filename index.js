// URLs of all frames that have registered that they
// have a global `can` present
var registeredFrameURLs = [];

// when user selects a new element in the Elements panel, pass it to the 
// "injected-script" so that viewModel and other data and bindings
// can be read from the correct element
chrome.devtools.panels.elements.onSelectionChanged.addListener(function() {
    // call `setSelectedElement` in each registered frame
    // this will set the selected element in the correct frame
    // and remove the selected element in other frames since $0 will be null
    for (var i=0; i<registeredFrameURLs.length; i++) {
        chrome.devtools.inspectedWindow.eval(
            "typeof __CANJS_DEVTOOLS__ !== 'undefined' && __CANJS_DEVTOOLS__.setSelectedElement($0)",
            { frameURL: registeredFrameURLs[i] },
            function(result, isException) {
                if (isException) {
                    console.error(isException);
                }
            }
        );
    }
});

// listen to messages from the injected-script
chrome.runtime.onMessage.addListener(function(msg, sender) {
    switch(msg.type) {
        case "register":
            if (registeredFrameURLs.length === 0) {
                initializeSidebars();
            }

            registeredFrameURLs.push(msg.frameURL);
            break;
        default:
            console.log("message received", msg);
    }
});

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

function initializeSidebars() {
    initializeSidebar(
        "CanJS ViewModel",
        "elements",
        "viewmodel-editor/index.html"
    );
//
//    initializeSidebar(
//        "CanJS Bindings Graph",
//        "elements",
//        "bindings-graph/index.html"
//    );
//
//    initializeSidebar(
//        "CanJS Queues Stack",
//        "sources",
//        // needs to have min-height of 50vh
//        "queues-stack/index.html"
//    );
}

function initializeSidebar(name, location, page) {
    chrome.devtools.panels[location].createSidebarPane(name, function(sidebar) {
        sidebar.setPage(page);
    });
}
