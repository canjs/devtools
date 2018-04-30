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
        <queues-logstack
            stack:from="stack"
			inspectTask:from="inspectTask"
        ></queues-logstack>
    `,

    ViewModel: {
	    stack: can.DefineList,

        inspectTask(taskIndex) {
            for (var i=0; i<registeredFrameURLs.length; i++) {
                chrome.devtools.inspectedWindow.eval(
                    "__CANJS_DEVTOOLS__.inspectTask(" + taskIndex + ")",
                    { frameURL: registeredFrameURLs[i] },
                    function(stack, isException) {
                        if (isException) {
                            console.error(isException);
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
                        function(stack, isException) {
                            if (stack) {
                                if (!vm.stack || vm.stack.length !== stack.length) {
                                    vm.stack = stack;
                                }
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
