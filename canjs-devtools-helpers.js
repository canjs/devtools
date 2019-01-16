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
                `typeof __CANJS_DEVTOOLS__ === 'object' && __CANJS_DEVTOOLS__.${options.fn ? options.fn() : options.fnString}`,
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
    },

    getBreakpointEvalString(expression, debuggerStatement = "debugger") {
        const prepExpression = (str, vmStr) => {
            return str.replace(/(^|\s|=|>|<|!|\/|%|\+|-|\*|&|\(|\)|~|\?|,|\[|\])([A-Za-z_])/g, (match, delimiter, prop) => {
                return `${delimiter}${vmStr}.${prop}`;
            });
        };

        const isBoolean = (str) => {
            return /[!=<>]/.test(str);
        };

        const realExpression = prepExpression(expression, "vm");
        const displayExpression = prepExpression(expression, "${vmName}");
        const isBooleanExpression = isBoolean(expression);

        return `
            (function() {
                const devtools = window.__CANJS_DEVTOOLS__;
                const vm = devtools.$0.viewModel;
                const vmName = devtools.canReflect.getName(vm);

                const observation = new devtools.canObservation(() => {
                    return ${realExpression};
                });

                const origDependencyChange = observation.dependencyChange;

                let oldValue = ${realExpression};

                observation.dependencyChange = function breakpoint() {
                    const newValue = ${realExpression};

                    const isBooleanExpression = ${isBooleanExpression};
                    const shouldBreak = !isBooleanExpression ||
                        (newValue == true && oldValue != true);

                    if (shouldBreak) {
                        devtools.canQueues.logStack();
                        ${debuggerStatement};
                    }

                    oldValue = newValue;

                    origDependencyChange.apply(this, arguments);
                };

                return {
                    expression: \`${displayExpression}\`,
                    observation: observation
                };
            }())
        `
    }
};

// listen to messages from the injected-script
chrome.runtime.onMessage.addListener(function(msg, sender) {
    if (msg.type === "__CANJS_DEVTOOLS_UPDATE_FRAMES__") {
        CANJS_DEVTOOLS_HELPERS.registeredFrames = msg.frames;
    }
});
