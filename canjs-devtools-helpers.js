window.CANJS_DEVTOOLS_HELPERS = {
    // URLs of all frames that have registered that they
    // have a global `can` present
    registeredFrames: {},

    runDevtoolsFunction: function(options) {
        var devtoolsHelpers = this;
        var timeoutIds = [];
        var keepRefreshing = true;

        var runDevtoolsFunctionForUrl = function(url) {
            var refreshDataForThisUrl = function() {
                if (keepRefreshing && options.refreshInterval) {
                    var timeoutId = setTimeout(function() {
                        runDevtoolsFunctionForUrl(url);
                    }, options.refreshInterval);

                    timeoutIds.push(timeoutId);
                }
            };

            chrome.devtools.inspectedWindow.eval(
                "typeof __CANJS_DEVTOOLS__ === 'object' && __CANJS_DEVTOOLS__." + options.fnString,
                { frameURL: url },
                function(result, exception) {
                    if (exception) {
                        // if there was an exception because we sent a message to a frame
                        // that no longer exists, remove that frame's URL from registeredFrames
                        // to prevent more exceptions before the next _UPDATE_FRAMES_ message
                        if (exception.code === "E_NOTFOUND") {
                            delete devtoolsHelpers.registeredFrames[ exception.details[0] ];
                        }
                        refreshDataForThisUrl();
                        return;
                    }

                    if (options.success) {
                        options.success(result);
                    }

                    refreshDataForThisUrl();
                }
            );
        };

        (function runDevtoolsFunctionForAllUrls() {
            var frameURLs = Object.keys(devtoolsHelpers.registeredFrames);

            if (frameURLs.length) {
                frameURLs.forEach(function(url) {
                    runDevtoolsFunctionForUrl(url);
                });
            } else {
                timeoutIds.push(
                    setTimeout(runDevtoolsFunctionForAllUrls, 500)
                );
            }
        }());

        return function() {
            keepRefreshing = false;

            timeoutIds.forEach((id) => {
                clearTimeout(id);
            });
        };
    }
};

// listen to messages from the injected-script
chrome.runtime.onMessage.addListener(function(msg, sender) {
    if (msg.type === "__CANJS_DEVTOOLS_UPDATE_FRAMES__") {
        CANJS_DEVTOOLS_HELPERS.registeredFrames = msg.frames;
    }
});
