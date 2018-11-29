var frames = {};

(function updateFrameURLs() {
    var frameURLs = Object.keys(frames);

    // send updated list of frames to canjs-devtools-helpers.js
    chrome.runtime.sendMessage({
        type: "__CANJS_DEVTOOLS_UPDATE_FRAMES__",
        frames: frames
    });

    // if there are active frames, update the icon/popup
    // to the blue CanJS logo when the page is using CanJS
    for (var i=0; i<frameURLs.length; i++) {
        chrome.browserAction.setPopup({
            tabId: frames[ frameURLs[i] ].tabId,
            popup: "popups/can.html"
        });

        chrome.browserAction.setIcon({
            tabId: frames[ frameURLs[i] ].tabId,
            path: {
                "16": "images/canjs-16-enabled.png"
            }
        });
    }

    setTimeout(updateFrameURLs, 2000);
}());

function getUrlFromPort(port) {
    return port.sender.url.split("#")[0];
}

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "canjs-devtools") {
        // listen for messages from canjs-devtools-content-script.js
        // and update frames map
        port.onMessage.addListener(function(msg, port) {
            var url = getUrlFromPort(port);

            frames[url] = {
                frameURL: url,
                tabId: port.sender.tab.id
            };
        });

        // remove frame when page or frame is closed
        port.onDisconnect.addListener(function(port) {
            var url = getUrlFromPort(port);

            if ( frames[url] ) {
                delete frames[url];
            }
        });
    }
});
