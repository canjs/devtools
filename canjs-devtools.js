var port = chrome.runtime.connect();

// helper functions that can be used by devtools panels / sidebars
function setSelectedElement(el) {
    // post message to background.js
    port.postMessage({
        type: "select-element",
        data: el.tagName
    });
}
