// run an expression in the page
var pageEval = chrome.devtools.inspectedWindow.eval;

// tostring a function and wrap in an IFFE so it can be evaled
var iffeify = function(fn) {
    return "(" + fn.toString() + "())";
};

// helpers for working with the selected element (`$0`)
var selectedElement = {
    getTagName: function getTagName() {
        return new Promise(function(resolve, reject) {
            var viewModel;

            pageEval("$0.tagName", function(result, isException) {
                if (isException) {
                    reject(isException);
                }
                resolve(result.toLowerCase());
            });
        });
    },

    debugFunction(fn, useViewModel, key) {
        var args = [];

        args.push( useViewModel ? "can.viewModel($0)" : "$0" );

        if (key) {
            args.push("'" + key + "'");
        }

        var command = "can.debug." + fn + "(" + args.join(", ") + ")";

        return new Promise(function(resolve, reject) {
            pageEval(command, function(result, isException) {
                if (isException) {
                    reject(isException);
                }
                resolve(result);
            });
        });
    },

    drawGraph(useViewModel, property) {
        selectedElement.debugFunction("drawGraph", useViewModel, property);
    }
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
    tag: "devtools-tabs-panel",

    ViewModel: {
		connectedCallback(element) {
			can.viewModel(element.parentNode).addPanel(this);
		},
		disconnectedCallback(element) {
			can.viewModel(element.parentNode).removePanel(this);
		},
		title: "string",
		active: {
			default: false
		}
    },

	view: "{{#if(active)}}<content></content>{{/if}}"
});

can.Component.extend({
    tag: "devtools-tabs",

	ViewModel: {
		active: "any",
		panels: {
			default() {
				return [];
			}
		},
		addPanel: function(panel){
			if( this.panels.length === 0 ) {
				this.makeActive(panel);
			}
			this.panels.push(panel);
		},
		removePanel: function(panel){
			var panels = this.panels;
			panels.splice(panels.indexOf(panel),1);
			if(panel === this.active){
				if(panels.length){
					this.makeActive(panels[0]);
				} else {
					this.active = undefined;
				}
			}
		},
		makeActive: function(panel){
			this.active = panel;
			this.panels.forEach(function(panel){
				panel.active = false;
			});
			panel.active = true;
		},
		isActive: function(panel) {
			return this.active == panel;
		}
	},

	view: `
		<ul>
		  {{#panels}}
			<li {{#if ../isActive(this)}}class='active'{{/if}}
				on:click="../makeActive(this)">
				<a href="#">{{title}}</a>
			</li>
		  {{/panels}}
		</ul>
		<content></content>
	`
});

can.Component.extend({
    tag: "devtools-log-stack",

    ViewModel: {
        refreshCount: { type: "number", default: 0 },

        refresh() {
            this.refreshCount++;
        },

        stack: {
            value({ resolve, listenTo }) {
                var updateStack = function() {
                    canHelpers.queuesStack()
                        .then(function(stack) {
                            resolve(stack);
                        });
                };

                listenTo("refreshCount", updateStack);

                updateStack();
            }
        },

        inspectStackFunction(taskIndex) {
            canHelpers.inspectStackFunction(taskIndex);
        }
    },

    view: `
        <nav>
            <button on:click="refresh()">Refresh</button>
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

    `
});

can.Component.extend({
    tag: "devtools-graph",

    ViewModel: {
		connectedCallback(element) {
            var vm = this;

            selectedElement.getTagName()
                .then(function(tagName) {
                    vm.selectedElementTagName = tagName;
                });

            var displayGraph = function() {
                selectedElement.drawGraph(this.useViewModel, this.selectedProperty);
            };

            this.listenTo("selectedElementTagName", displayGraph);
            this.listenTo("selectedProperty", displayGraph);

            return this.stopListening.bind( this );
        },

        useViewModel: { type: "boolean", default: true },

        selectedProperty: "string",

        selectedElementTagName: "string"
	},

    view: `
        <nav>
            <label>
                ViewModel?
                <input type="checkbox" checked:bind="useViewModel">
            </label>
            <label>
                Property:
                <input type="text" value:bind="selectedProperty">
            </label>
        </nav>
        <h1>
            Graph for <{{selectedElementTagName}}>{{#if(useViewModel)}}'s ViewModel{{/if}}{{#if(selectedProperty)}}'s "{{selectedProperty}}" property{{/if}}
        </h1>
    `
});

can.Component.extend({
    tag: "devtools-panel",

    ViewModel: {},

    view: `
        <devtools-tabs>
            <devtools-tabs-panel title:raw="Queues">
                <devtools-log-stack></devtools-log-stack>
            </devtools-tabs-panel>
            <devtools-tabs-panel title:raw="Bindings">
                <devtools-graph></devtools-graph>
            </devtools-tabs-panel>
        </devtools-tabs>
    `
});
