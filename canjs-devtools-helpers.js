window.CANJS_DEVTOOLS_HELPERS = {
    // URLs of all frames that have registered that they
    // have a global `can` present
    registeredFrameURLs: [],

    runDevtoolsFunction: function(fnString, cb) {
        var registeredFrameURLs = this.registeredFrameURLs;

        for (var i=0; i<registeredFrameURLs.length; i++) {
            chrome.devtools.inspectedWindow.eval(
                "typeof __CANJS_DEVTOOLS__ === 'object' && __CANJS_DEVTOOLS__." + fnString,
                { frameURL: registeredFrameURLs[i] },
                function(result, isException) {
                    if (isException) {
                        return;
                    }

                    if (cb) {
                        cb(result);
                    }
                }
            );
        }
    }
};

// listen to messages from the injected-script
chrome.runtime.onMessage.addListener(function(msg, sender) {
    if (msg.type === "__CANJS_DEVTOOLS_REGISTER_FRAME__") {
        CANJS_DEVTOOLS_HELPERS.registeredFrameURLs = msg.frameURLs;
    }
});
