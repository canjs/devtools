const frames = {};

function updateFrameURLs() {
    const frameURLs = Object.keys(frames);

    // send updated list of frames to canjs-devtools-helpers.mjs
    chrome.runtime.sendMessage({
        type: "__CANJS_DEVTOOLS_UPDATE_FRAMES__",
        frames: frames
    });

    // if there are active frames, update the icon/popup
    // to the blue CanJS logo when the page is using CanJS
    for (let i=0; i<frameURLs.length; i++) {
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
}

function getUrlFromPort(port) {
    return port.sender.url.split("#")[0];
}

chrome.runtime.onConnect.addListener(function(port) {
    // listen for messages from canjs-devtools-content-script.js
    if (port.name === "canjs-devtools") {
        // and update frames map
        port.onMessage.addListener(function messageHandler(msg, port) {
            // if this is a new frame being registered by the
            // content-script, add its url to the frames list
            // and update the frames lists in all helpers scripts
            // that have executed already
            if (msg === "page-loaded") {
                const url = getUrlFromPort(port);

                frames[url] = {
                    frameURL: url,
                    tabId: port.sender.tab.id
                };

                updateFrameURLs();
            }

            // if the helpers script is executing for the first time,
            // just update the frames lists
            if (msg === "canjs-devtools-loaded") {
                updateFrameURLs();
            }
        });

        // remove frame when page or frame is closed
        port.onDisconnect.addListener(function disconnectHandler(port) {
            const url = getUrlFromPort(port);

            if (frames[url]) {
                delete frames[url];
            }

            updateFrameURLs();
        });
    }
});
