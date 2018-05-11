can.Component.extend({
    tag: "canjs-devtools-bindings-graph",

    view: `
        {{#if error}}
            <h2>{{error}}</h2>
        {{else}}
            {{#unless selectedObj}}
                <h2>Select an element to see its bindings graph</h2>
            {{else}}
                <bindings-graph
                    graphData:from="graphData"
                    availableKeys:from="availableKeys"
                    selectedObj:from="selectedObj"
                    selectedKey:bind="selectedKey"
                ></bindings-graph>
            {{/unless}}
        {{/if}}
    `,

    ViewModel: {
        graphData: { Type: can.DefineMap, Default: can.DefineMap },
        availableKeys: { Type: can.DefineList, Default: can.DefineList },
        selectedObj: "string",
        selectedKey: "string",
        error: "string",

        connectedCallback() {
            var vm = this;

            var loadGraphData = function() {
                window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction(
                    "getBindingsGraphData($0, '" + vm.selectedKey + "')",
                    function(result) {
                        var status = result.status;
                        var detail = result.detail;

                        switch(status) {
                            case "ignore":
                                break;
                            case "error":
                                vm.error = detail;
                                break;
                            case "success":
                                vm.error = null;
                                vm.selectedObj = detail.selectedObj;
                                vm.availableKeys.replace(detail.availableKeys);
                                if (detail.graphData) {
                                    vm.graphData = detail.graphData;
                                } else {
                                    can.Reflect.deleteKeyValue(vm, "graphData");
                                }
                                break;
                        }
                    }
                );
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
            }());

            // update graph data when user selects a new element
            chrome.devtools.panels.elements.onSelectionChanged.addListener(loadGraphData);

            // update graph data when user selects a new property
            this.listenTo("selectedKey", loadGraphData);

            return function() {
                this.stopListening();
                chrome.devtools.panels.elements.onSelectionChanged.removeListener(loadGraphData);
            };
        }
    }
});
