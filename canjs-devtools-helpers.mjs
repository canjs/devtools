const helpers = {
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

    getSafeKey(key, prependStr) {
        var parts = key.split(".");
        let last = "";

        const safeParts = parts.reduce((newParts, key) => {
            last = last ? `${last}.${key}` : `${prependStr}.${key}`;
            newParts.push(last);
            return newParts;
        }, []);

        if (parts.length > 1) {
            return `(${safeParts.join(" && ")})`;
        } else {
            return safeParts.join(" && ");
        }
    },

    getObservationExpression(expression) {
        return expression.replace(/(^|\s|=|>|<|!|\/|%|\+|-|\*|&|\(|\)|~|\?|,|\[|\])([A-Za-z_:.]*)/g, (match, delimiter, key) => {
            return `${delimiter}${key ? this.getSafeKey(key, "vm") : ""}`;
        });
    },

    getDisplayExpression(expression) {
        return expression.replace(/(^|\s|=|>|<|!|\/|%|\+|-|\*|&|\(|\)|~|\?|,|\[|\])([A-Za-z_])/g, (match, delimiter, prop) => {
            return `${delimiter}\$\{vmName\}.${prop}`;
        });
    },

    isBooleanExpression(expression) {
        return /[!=<>]/.test(expression);
    },

    getBreakpointEvalString(expression, debuggerStatement = "debugger") {
        const realExpression = this.getObservationExpression(expression);
        const displayExpression = this.getDisplayExpression(expression);
        const isBooleanExpression = this.isBooleanExpression(expression);

        return `(function() {
        const Observation = window.__CANJS_DEVTOOLS__.canObservation;
        const queues = window.__CANJS_DEVTOOLS__.canQueues;
        const selectedComponent = window.__CANJS_DEVTOOLS__.$0;
        if (!selectedComponent) {
            return { error: "Please select a component in order to create a mutation breakpoint for its ViewModel" };
        }
        const vm = selectedComponent.viewModel;
        const vmName = window.__CANJS_DEVTOOLS__.canReflect.getName(vm);
        let oldValue = ${realExpression};

        const observation = new Observation(() => {
            return ${realExpression};
        });
        const origDependencyChange = observation.dependencyChange;

        observation.dependencyChange = function() {
            const newValue = ${realExpression};
            ${ isBooleanExpression ?
            `if (newValue == true && oldValue != true) {
                queues.logStack();
                ${debuggerStatement};
            }` :
            `queues.logStack();
            ${debuggerStatement};`
            }
            oldValue = newValue;

            return origDependencyChange.apply(this, arguments);
        };

        return {
            expression: \`${displayExpression}\`,
            observation: observation
        };
    }())`
    }
};

if (typeof chrome !== "undefined") {
    // listen to messages from the injected-script
    chrome.runtime.onMessage.addListener(function(msg, sender) {
        if (msg.type === "__CANJS_DEVTOOLS_UPDATE_FRAMES__") {
            helpers.registeredFrames = msg.frames;
        }
    });
}

export default helpers;
