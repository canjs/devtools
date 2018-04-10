// this "content script" runs in an isolated environment from the page
// it has access to the DOM, but now the `window`
// as well as _some_ chrome.* APIs
// see: https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script/9517879#9517879
var port = chrome.runtime.connect();

// listen for event that will be dispatched by canjs-devtools-injected-script
// https://stackoverflow.com/a/9636008/3023130
document.addEventListener("canjs-devtools-response", function(response) {
    var action = response.detail && response.detail.action;

    switch(action) {
        case "viewModel":
            var data = response.detail.data;

            // send the viewmodel data for the new element to the devtools extension
            port.postMessage({
                type: "viewModel",
                tagName: data.tagName,
                viewModel: data.viewModel
            });
            break;

        case "default":
            break;
    }
});

// inject the "helpers" script which runs directly in the page
var s = document.createElement("script");
s.src = chrome.extension.getURL("canjs-devtools-injected-script.js");
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);

// helper functions that can be used by devtools panels / sidebars

// load the viewModel data for the selected element (`$0` in devtools)
// this adds the unique className to the element
// and then dispatches an event for the injected script to load the data
// since it has access to `can`
var getViewModelData = function(selectedElement) {
    var className = "__canjs-devtools-selected-element__";
    var oldElements = document.getElementsByClassName(className);

    for (var i=0; i<oldElements.length; i++) {
        oldElements[i].classList.remove(className);
    }

    selectedElement.classList.add(className);

    triggerEvent("viewModel");
};

var triggerEvent = function triggerEvent(eventName) {
    var request = new CustomEvent("canjs-devtools-request", {
        detail: {
            action: eventName
        }
    });

    document.dispatchEvent(request);
};
