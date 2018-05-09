// URLs of all frames that have registered that they
// have a global `can` present
var registeredFrameURLs = [];

// listen to messages from the injected-script
chrome.runtime.onMessage.addListener(function(msg, sender) {
    if (msg.type === "update-frames") {
        registeredFrameURLs = msg.frameURLs;
    }
});

can.Component.extend({
    tag: "canjs-devtools-queues-stack",

    view: `
        {{#if error}}
            <h2>{{error}}</h2>
        {{else}}
            <queues-logstack
                stack:from="stack"
                inspectTask:from="inspectTask"
            ></queues-logstack>
        {{/if}}
    `,

    ViewModel: {
        stack: { Type: can.DefineList, Default: can.DefineList },
        error: "string",
        activeFrame: "string",

        inspectTask(taskIndex) {
            for (var i=0; i<registeredFrameURLs.length; i++) {
                chrome.devtools.inspectedWindow.eval(
                    "__CANJS_DEVTOOLS__.inspectTask(" + taskIndex + ")",
                    { frameURL: registeredFrameURLs[i] },
                    function(stack, isException) {
                        if (isException) {
                            return;
                        }
                    }
                );
            }
        },

        connectedCallback() {
            var timeoutId;
            var vm = this;

            var updateStack = function() {
                for (var i=0; i<registeredFrameURLs.length; i++) {
                    chrome.devtools.inspectedWindow.eval(
                        "__CANJS_DEVTOOLS__.queuesStack()",
                        { frameURL: registeredFrameURLs[i] },
                        function(result, isException) {
                            if (isException) {
                                return;
                            }

                            var status = result.status;
                            var stack = result.detail.stack;
                            var frameURL = result.detail.frameURL;

                            switch(status) {
                                case "ignore":
                                    break;
                                case "error":
                                    vm.error = detail;
                                    break;
                                case "success":
                                    // if response is received from a frame other than the
                                    // last `activeFrame`, only overwrite data if there is
                                    // data on the stack
                                    var shouldUpdate =
                                        (
                                            frameURL === vm.activeFrame && // apply updates from the `activeFrame`
                                            stack.length !== vm.stack.length // if the length is the same, we assume the list is the same so that sidebar doesn't flash
                                        ) ||
                                        (
                                            frameURL !== vm.activeFrame && // apply updates from another frame only
                                            stack.length !== 0 // if there are items on the stack
                                        );

                                    if (shouldUpdate) {
                                        vm.activeFrame = frameURL;
                                        vm.stack = stack;
                                    }

                                    break;
                            }
                        }
                    );
                }

                timeoutId = setTimeout(updateStack, 100);
            };

            updateStack();

            return function disconnect() {
                clearTimeout(timeoutId);
            };
        }
    }
});
