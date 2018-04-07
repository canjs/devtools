chrome.runtime.onConnect.addListener(function(port) {
    // listen to messages from the canjs-devtools.js
    port.onMessage.addListener(function(msg) {
        // pass messages through to extension (panels, sidebar, etc)
        chrome.runtime.sendMessage(msg);
    });
});
