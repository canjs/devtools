var pageEval = chrome.devtools.inspectedWindow.eval;

var contentScriptEval = function(jsString, callback) {
    return pageEval(
        jsString,
        { useContentScriptContext: true },
        callback
    );
};

// set up handler for when element selected in devtools changes
chrome.devtools.panels.elements.onSelectionChanged.addListener(
    function selectedElementChangeHandler() {
        contentScriptEval("getViewModelData($0)");
    }
);

function displayViewModelData(tagName, viewModel) {
    var header = document.createElement("h1");
    var headerText = document.createTextNode("<" + tagName.toLowerCase() + "> ViewModel");
    header.appendChild(headerText);

    document.body.innerHTML = "";
    document.body.appendChild(header);

    for (var key in viewModel) {
        var p = document.createElement("p");
        var keyText = document.createTextNode(key + ": ");
        var valueText = document.createTextNode(viewModel[key]);

        p.appendChild(keyText);
        p.appendChild(valueText);

        document.body.appendChild(p);
    }
}

chrome.runtime.onMessage.addListener(function(msg, sender) {
    switch(msg.type) {
        case "viewModel":
            displayViewModelData(msg.tagName, msg.viewModel);
            break;
        default:
            console.log("unknown message:", JSON.stringify(msg));
            break;
    }
});
