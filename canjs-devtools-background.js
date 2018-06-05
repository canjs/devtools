var frameURLs = new Set([]);

(function updateFrameURLs() {
    // send updated list of frames to canjs-devtools-helpers.js
    chrome.runtime.sendMessage({
        type: "__CANJS_DEVTOOLS_UPDATE_FRAMES__",
        frameURLs: Array.from(frameURLs)
    });

    // clear frames to remove any inactive URLs
    frameURLs.clear();

    setTimeout(updateFrameURLs, 2000);
}());

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "canjs-devtools") {
        // listen for messages from canjs-devtools-content-script.js
        port.onMessage.addListener(function(msg, port) {
            frameURLs.add( port.sender.url.split("#")[0] );
        });
    }
});
