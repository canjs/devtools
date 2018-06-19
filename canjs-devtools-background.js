var frames = {};

(function updateFrameURLs() {
    var frameURLs = Object.keys(frames);

    if (frameURLs.length) {
        // send updated list of frames to canjs-devtools-helpers.js
        chrome.runtime.sendMessage({
            type: "__CANJS_DEVTOOLS_UPDATE_FRAMES__",
            frames: frames
        });
    }

    setTimeout(updateFrameURLs, 2000);
}());

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "canjs-devtools") {
        // listen for messages from canjs-devtools-content-script.js
        // and update frames map
        port.onMessage.addListener(function(msg, port) {
            var url = port.sender.url.split("#")[0];

            frames[url] = {
                frameURL: url,
                tabId: port.sender.tab.id
            };
        });
    }
});
