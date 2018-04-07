chrome.devtools.panels.elements.onSelectionChanged.addListener(function() {
    chrome.devtools.inspectedWindow.eval("setSelectedElement($0)",
        { useContentScriptContext: true });
});

chrome.runtime.onMessage.addListener(function(msg, sender) {
    switch(msg.type) {
        case "select-element":
            setSelectedElement(msg.data);
            break;
        default:
            console.log("unknown message:", JSON.stringify(msg));
            break;
    }
});

function setSelectedElement(tagName) {
    var span = document.querySelector("span");
    span.innerHTML = tagName;
}
