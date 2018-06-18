window.CANJS_DEVTOOLS_HELPERS = {
    // URLs of all frames that have registered that they
    // have a global `can` present
    registeredFrames: {},

    runDevtoolsFunction: function(fnString, cb) {
        var registeredFrames = this.registeredFrames;

        var frameURLs = Object.keys(this.registeredFrames);

        for (var i=0; i<frameURLs.length; i++) {
            chrome.devtools.inspectedWindow.eval(
                "typeof __CANJS_DEVTOOLS__ === 'object' && __CANJS_DEVTOOLS__." + fnString,
                { frameURL: frameURLs[i] },
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
    if (msg.type === "__CANJS_DEVTOOLS_UPDATE_FRAMES__") {
        CANJS_DEVTOOLS_HELPERS.registeredFrames = msg.frames;
    }
});
