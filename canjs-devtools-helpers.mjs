const helpers = {
    // URLs of all frames that have registered that they
    // have a global `can` present
    registeredFrames: {},

    runDevtoolsFunction(options) {
        const timeoutIds = [];
        let keepRefreshing = true;

        const runDevtoolsFunctionForUrl = (url) => {
            const refreshDataForThisUrl = () => {
                if (keepRefreshing && options.refreshInterval) {
                    const timeoutId = setTimeout(() => {
                        runDevtoolsFunctionForUrl(url);
                    }, options.refreshInterval);

                    timeoutIds.push(timeoutId);
                }
            };

            if (helpers.registeredFrames[url]) {
                chrome.devtools.inspectedWindow.eval(
                    `typeof __CANJS_DEVTOOLS__ === 'object' && __CANJS_DEVTOOLS__.${options.fn ? options.fn() : options.fnString}`,
                    { frameURL: url },
                    (result, exception) => {
                        if (exception) {
                            refreshDataForThisUrl();
                            return;
                        }

                        if (options.success) {
                            options.success(result);
                        }

                        refreshDataForThisUrl();
                    }
                );
            }
        };

        const runDevtoolsFunctionForAllUrls = () => {
            const frameURLs = Object.keys(helpers.registeredFrames);

            if (frameURLs.length) {
                frameURLs.forEach((url) => {
                    runDevtoolsFunctionForUrl(url);
                });
            } else {
                timeoutIds.push(
                    setTimeout(runDevtoolsFunctionForAllUrls, 500)
                );
            }
        };
        runDevtoolsFunctionForAllUrls();

        // teardown function
        return () => {
            keepRefreshing = false;

            timeoutIds.forEach((id) => {
                clearTimeout(id);
            });
        };
    },

    getSafeKey(key, prependStr) {
        const parts = key.split(".");
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

if (typeof chrome === "object" && chrome.runtime && chrome.runtime.onMessage) {
    // listen to messages from the background script
    chrome.runtime.onMessage.addListener((msg, sender) => {
        if (msg.type === "__CANJS_DEVTOOLS_UPDATE_FRAMES__") {
            helpers.registeredFrames = msg.frames;
        }
    });

    // when a devtools panel is opened, request an updated list of frames
    var port = chrome.runtime.connect({ name: "canjs-devtools" });
    port.postMessage("canjs-devtools-loaded");
}

export default helpers;
