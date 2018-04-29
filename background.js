var frameURLs = new Set([]);

function sendFrameURLs() {
    chrome.runtime.sendMessage({
        type: "update-frames",
        frameURLs: Array.from(frameURLs)
    });

    setTimeout(sendFrameURLs, 2000);
}

chrome.runtime.onConnect.addListener(function(port) {	
    if (port.name === "canjs-devtools") {
        // listen to messages from the canjs-devtools.js	
        port.onMessage.addListener(function(msg, port) {	
            frameURLs.add( port.sender.url );
        });	
    }

    sendFrameURLs();
});
