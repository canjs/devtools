// run an expression in the page
var pageEval = chrome.devtools.inspectedWindow.eval;

// tostring a function and wrap in an IFFE so it can be evaled
var iffeify = function(fn) {
    return "(" + fn.toString() + "())";
};

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
    tag: "devtools-panel",

    view: `
        <nav>
            <button on:click="logStack()">Show can-queues.logStack()</button>
        </nav>

        {{#if(stack)}}
            {{#unless(stack.length}}
                No tasks on the can-queues.stack
            {{else}}
                <table>
                    <tbody>
                        <tr>
                            <th>#</th>
                            <th>Queue</th>
                            <th>Reason</th>
                            <th>Context</th>
                            <th>Function</th>
                        </tr>
                        {{#each(stack, task=value index=index)}}
                        <tr>
                            <td>{{index}}</td>
                            <td>{{task.queue}}</td>
                            <td>{{task.reason}}</td>
                            <td>{{task.context}}</td>
                            <td>
                                <a on:click="scope.root.inspectStackFunction(index)" href="#">
                                    {{task.fn}}
                                </a>
                            </td>
                        </tr>
                        {{/each}}
                    </tbody>
                </table>
            {{/unless}}
        {{/if}}

    `,

    ViewModel: {
        stack: "any",

        inspectStackFunction(taskIndex) {
            canHelpers.inspectStackFunction(taskIndex);
        },

        logStack() {
            var vm = this;

            canHelpers.queuesStack()
                .then(function(stack) {
                    vm.stack = stack;
                })
                .catch(function(err) {
                    console.error(err);
                });
        }
    }
});
