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
    tag: "canjs-devtools-bindings-graph",

    ViewModel: {
        graphData: { Type: can.DefineMap, Default: can.DefineMap },
        availableKeys: { Type: can.DefineList, Default: can.DefineList },
        selectedObj: "string",
        selectedKey: "string",

        connectedCallback() {
            var vm = this;

            var loadGraphData = function() {
                for (var i=0; i<registeredFrameURLs.length; i++) {
                    chrome.devtools.inspectedWindow.eval(
                        "__CANJS_DEVTOOLS__.getBindingsGraphData($0, '" + vm.selectedKey + "')",
                        { frameURL: registeredFrameURLs[i] },
                        function(result, isException) {
                            if (result) {
                                vm.selectedObj = result.selectedObj;
                                vm.availableKeys.replace(result.availableKeys);
                                if (result.graphData) {
                                    vm.graphData = result.graphData;
                                } else {
                                    can.Reflect.deleteKeyValue(vm, "graphData");
                                }
                            }
                        }
                    )
                }
            };

            // load initial data
            loadGraphData();

            // update graph data when user selects a new element
            chrome.devtools.panels.elements.onSelectionChanged.addListener(loadGraphData);

            // update graph data when user selects a new property
            this.listenTo("selectedKey", loadGraphData);

            return function() {
                this.stopListening();
                chrome.devtools.panels.elements.onSelectionChanged.removeListener(loadGraphData);
            };
        }
    },

    view: `
        <bindings-graph
			graphData:from="graphData"
            availableKeys:from="availableKeys"
            selectedObj:from="selectedObj"
            selectedKey:bind="selectedKey"
        ></bindings-graph>
    `
});
