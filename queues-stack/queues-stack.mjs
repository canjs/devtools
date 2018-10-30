import { Component, DefineList } from "../node_modules/can-devtools-components/dist/queues-logstack.mjs";

Component.extend({
    tag: "canjs-devtools-queues-stack",

    view: `
        {{#if error}}
            <h2>{{{error}}}</h2>
        {{else}}
            <queues-logstack
                stack:from="stack"
                inspectTask:from="inspectTask"
            ></queues-logstack>
        {{/if}}
    `,

    ViewModel: {
        stack: { Type: DefineList, Default: DefineList },
        error: "string",
        activeFrame: "string",

        inspectTask(taskIndex) {
            window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction(
                "inspectTask(" + taskIndex + ")"
            );
        },

        connectedCallback() {
            var timeoutId;
            var vm = this;

            var updateStack = function() {
                window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction(
                    "queuesStack()",
                    function(result) {
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

                timeoutId = setTimeout(updateStack, 100);
            };

            updateStack();

            return function disconnect() {
                clearTimeout(timeoutId);
            };
        }
    }
});
