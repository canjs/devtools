import {
	ObservableArray,
	StacheElement,
	type
} from "../node_modules/can-devtools-components/dist/queues-logstack.mjs";

import helpers from "../canjs-devtools-helpers.mjs";

class CanjsDevtoolsQueuesStack extends StacheElement {
	static get view() {
		return `
			{{# if(this.stackError) }}
				<h2>{{{ this.stackError }}}</h2>
			{{ else }}
				<queues-logstack
					stack:from="this.stack"
					inspectTask:from="this.inspectTask"
				></queues-logstack>
			{{/ if }}
		`;
	}

	static get props() {
		return {
			stack: {
				type: type.convert(ObservableArray),

				get default() {
					return new ObservableArray();
				}
			},

			stackError: String,
			activeFrame: String
		};
	}

	connected() {
		var vm = this;

		var stopRefreshing = helpers.runDevtoolsFunction({
			fnString: "queuesStack()",
			refreshInterval: 100,
			success: function(result) {
				var status = result.status;
				var stack = result.detail.stack;
				var frameURL = result.detail.frameURL;

				switch (status) {
					case "ignore":
						break;
					case "error":
						vm.error = result.detail;
						break;
					case "success":
						// if response is received from a frame other than the
						// last `activeFrame`, only overwrite data if there is
						// data on the stack
						var shouldUpdate =
							(frameURL === vm.activeFrame && // apply updates from the `activeFrame`
								stack.length !== vm.stack.length) || // if the length is the same, we assume the list is the same so that sidebar doesn't flash
							(frameURL !== vm.activeFrame && // apply updates from another frame only
								stack.length !== 0); // if there are items on the stack

						if (shouldUpdate) {
							vm.activeFrame = frameURL;
							vm.stack = stack;
						}

						break;
				}
			}
		});

		return function disconnect() {
			stopRefreshing();
		};
	}

	inspectTask(taskIndex) {
		helpers.runDevtoolsFunction({
			fnString: "inspectTask(" + taskIndex + ")"
		});
	}
}

customElements.define("canjs-devtools-queues-stack", CanjsDevtoolsQueuesStack);
