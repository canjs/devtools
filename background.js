chrome.runtime.onConnect.addListener(function(port) {	
    if (port.name === "canjs-devtools") {
        // listen to messages from the canjs-devtools.js	
        port.onMessage.addListener(function(msg, port) {	
            // pass messages through to extension panels
            chrome.runtime.sendMessage(msg);	
        });	
    }
});
