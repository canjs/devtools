import {
	ObservableArray,
	ObservableObject,
	StacheElement,
	type
} from "../node_modules/can-devtools-components/dist/bindings-graph.mjs";

import helpers from "../canjs-devtools-helpers.mjs";

class CanjsDevtoolsBindingsGraph extends StacheElement {
	static get view() {
		return `
			{{# if(this.bindingsError) }}
				<h2>{{{ this.bindingsError }}}</h2>
			{{ else }}
				{{# unless(this.selectedObj) }}
					<h2>Select an element to see its bindings graph</h2>
				{{ else }}
					<bindings-graph
						graphData:from="this.graphData"
						availableKeys:from="this.availableKeys"
						selectedObj:from="this.selectedObj"
						selectedKey:bind="this.selectedKey"
					></bindings-graph>
				{{/unless}}
			{{/if}}
		`;
	}

	static get props() {
		return {
			graphData: type.maybeConvert(ObservableObject),

			availableKeys: {
				type: type.convert(ObservableArray),

				get default() {
					return new ObservableArray();
				}
			},

			selectedObj: String,
			selectedKey: type.maybe(String),
			bindingsError: type.maybe(String)
		};
	}

	connected() {
		var vm = this;

		var loadGraphData = function() {
			helpers.runDevtoolsFunction({
				fnString: "getBindingsGraphData($0, '" + vm.selectedKey + "')",
				success: function(result) {
					var status = result.status;
					var detail = result.detail;

					switch (status) {
						case "ignore":
							break;
						case "error":
							vm.bindingsError = detail;
							break;
						case "success":
							vm.bindingsError = '';
							vm.selectedObj = detail.selectedObj;
							vm.availableKeys.splice(0, vm.availableKeys.length, ...detail.availableKeys);
							if (detail.graphData) {
								vm.graphData = detail.graphData;
							} else {
								Reflect.deleteKeyValue(vm, "graphData");
							}
							break;
					}
				}
			});
		};

		// there is a slight delay between when the devtools panel is opened
		// and when $0 will be set correctly so that the graph data can be returned
		// so this sets up polling to load the initial data.
		// once the data is inititally loaded, polling is not necessary because it
		// will be updated by the `onSelectionChanged` handler below.
		(function loadInitialGraphData() {
			// load initial data
			loadGraphData();

			if (!vm.selectedObj) {
				setTimeout(loadInitialGraphData, 100);
			}
		})();

		// update graph data when user selects a new element
		chrome.devtools.panels.elements.onSelectionChanged.addListener(
			loadGraphData
		);

		// update graph data when user selects a new property
		this.listenTo("selectedKey", loadGraphData);

		return function() {
			this.stopListening();
			chrome.devtools.panels.elements.onSelectionChanged.removeListener(
				loadGraphData
			);
		};
	}
}

customElements.define(
	"canjs-devtools-bindings-graph",
	CanjsDevtoolsBindingsGraph
);
