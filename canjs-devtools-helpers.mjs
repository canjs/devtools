const helpers = {
    // URLs of all frames that have registered that they
    // have a global `can` present
    registeredFrames: {},

    // breakpoints loaded from background script when page is loaded
    storedBreakpoints: [],

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
            } else {
                if (options.success) {
                    // if there were frames before, and there are no frames now
                    // reset data to the "empty" state
                    options.success({
                        status: "success",
                        detail: {}
                    });
                    refreshDataForThisUrl();
                }
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

    getBreakpointEvalString({
        expression,
        enabled = true,
        observationExpression = this.getObservationExpression(expression),
        selectedComponentStatement = "window.__CANJS_DEVTOOLS__.$0",
        displayExpression = this.getDisplayExpression(expression),
        pathStatement = "window.__CANJS_DEVTOOLS__.pathOf$0",
        debuggerStatement = "debugger" // overwritable for testing
    }) {
        const isBooleanExpression = this.isBooleanExpression(observationExpression);

        return `(function() {
        const Observation = window.__CANJS_DEVTOOLS__.canObservation;
        const queues = window.__CANJS_DEVTOOLS__.canQueues;
        const selectedComponent = ${selectedComponentStatement};

        if (!selectedComponent) {
            return { error: "Please select a component in order to create a mutation breakpoint for its ViewModel" };
        }

        const vm = selectedComponent.viewModel;
        const vmName = window.__CANJS_DEVTOOLS__.canReflect.getName(vm);
        let oldValue = ${observationExpression};

        const observation = new Observation(() => {
            return ${observationExpression};
        });
        const origDependencyChange = observation.dependencyChange;

        observation.dependencyChange = function() {
            const newValue = ${observationExpression};
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
            observation: observation,
            observationExpression: \`${observationExpression}\`,
            path: ${pathStatement},
            enabled: ${enabled}
        };
    }())`
    }
};

if (typeof chrome === "object" && chrome.runtime && chrome.runtime.onMessage) {
    // listen to messages from the background script
    chrome.runtime.onMessage.addListener((msg, sender) => {
        switch(msg.type) {
            case  "__CANJS_DEVTOOLS_UPDATE_FRAMES__":
                helpers.registeredFrames = msg.frames;
                break;
            case  "__CANJS_DEVTOOLS_UPDATE_BREAKPOINTS__":
                helpers.storedBreakpoints = msg.breakpoints;
                break;
        }
    });

    // when a devtools panel is opened, request an updated list of frames
    var port = chrome.runtime.connect({ name: "canjs-devtools" });
    port.postMessage({ type: "canjs-devtools-loaded" });
}

export default helpers;
