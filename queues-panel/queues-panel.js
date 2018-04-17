// run an expression in the page
var pageEval = chrome.devtools.inspectedWindow.eval;

// tostring a function and wrap in an IFFE so it can be evaled
var iffeify = function(fn) {
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
            pageEval(iffeify( canHelpers.queuesFilterStack ), function(result, isException) {
                if (isException) {
                    reject(isException);
                }

                resolve(result);
            });
        });
    },

    inspectStackFunction(index) {
        pageEval("inspect( can.queues.stack()[" + index + "].fn )", function(result, isException) {
            if (isException) {
                console.error(isException);
            }
        });
    }
};

can.Component.extend({
    tag: "canjs-devtools-queues-panel",

    view: `
        <queues-logstack
            stack:from="stack"
			functionClickHandler:from="inspectStackFunction"
        ></queues-logstack>
    `,

    ViewModel: {
	    stack: can.DefineList,

        inspectStackFunction(taskIndex) {
            canHelpers.inspectStackFunction(taskIndex);
        },

        connectedCallback() {
            var vm = this;

            var updateStack = function() {
                canHelpers.queuesStack()
                    .then(function(stack) {
                        if (!vm.stack || vm.stack.length !== stack.length) {
                            vm.stack = stack;
                        }
                    });

                setTimeout(updateStack, POLLING_INTERVAL);
            };

            updateStack();
        }
    }
});
