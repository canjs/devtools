// run an expression in the page
var pageEval = chrome.devtools.inspectedWindow.eval;

// tostring a function and wrap in an IIFE so it can be evaled
var iifeify = function(fn) {
    return "(" + fn.toString() + "())";
};

var POLLING_INTERVAL = 100;

// helpers for accessing main page's `can`
var canHelpers = {
    queuesFilterStack: function() {
        return can.queues.stack().map(function(task) {
            return {
                queue: task.meta.stack.name,
                context: can.Reflect.getName(task.context),
                fn: can.Reflect.getName(task.fn),
                reason: task.meta && task.meta.reasonLog && task.meta.reasonLog.join(" ")
            };
        });
    },

    queuesStack() {
        return new Promise(function(resolve, reject) {
            pageEval(iifeify( canHelpers.queuesFilterStack ), function(result, isException) {
                if (isException) {
                    reject(isException);
                }

                resolve(result);
            });
        });
    },

    inspectTask(index) {
        pageEval("inspect( can.queues.stack()[" + index + "].fn )", function(result, isException) {
            if (isException) {
                console.error(isException);
            }
        });
    }
};

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
            canHelpers.inspectTask(taskIndex);
        },

        connectedCallback() {
            var timeoutId;
            var vm = this;

            var updateStack = function() {
                canHelpers.queuesStack()
                    .then(function(stack) {
                        if (!vm.stack || vm.stack.length !== stack.length) {
                            vm.stack = stack;
                        }
                    });

                timeoutId = setTimeout(updateStack, POLLING_INTERVAL);
            };

            updateStack();

            return function disconnect() {
                clearTimeout(timeoutId);
            };
        }
    }
});