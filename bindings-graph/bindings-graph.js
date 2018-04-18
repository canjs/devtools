// run an expression in the page
var pageEval = chrome.devtools.inspectedWindow.eval;

// tostring a function and wrap in an IFFE so it can be evaled
var iffeify = function(fn) {
    return "(" + fn.toString() + "())";
};

// helpers for working with the selected element (`$0`)
var selectedElement = {
    getTagName() {
        return new Promise(function(resolve, reject) {
            pageEval("$0.tagName", function(result, isException) {
                if (isException) {
                    reject(isException);
                }
                resolve(result.toLowerCase());
            });
        });
    },

    hasViewModel() {
        return new Promise(function(resolve, reject) {
            pageEval("$0[can.Symbol.for('can.viewModel')]", function(hasViewModel, isException) {
                if (isException) {
                    reject(isException);
                }
                resolve(!!hasViewModel);
            });
        });
    },

    getViewModelKeys() {
        return new Promise(function(resolve, reject) {
            pageEval("can.Reflect.getOwnKeys( can.viewModel( $0 ) )", function(keys, isException) {
                if (isException) {
                    reject(isException);
                }

                resolve(keys);
            });
        });
    },

    getElementKeysHelper: function() {
        var keysSet = new Set([]);
        var keysMap = $0.attributes;

        for (var i=0; i<keysMap.length; i++) {
            var key = keysMap[i].name.split(/:to|:from|:bind/)[0];
            key = key.split(":")[key.split(":").length - 1]
            keysSet.add( key );
        }


        return Array.from(keysSet);
    },

    getElementKeys() {
        return new Promise(function(resolve, reject) {
            pageEval( iffeify( selectedElement.getElementKeysHelper ), function(keys, isException) {
                if (isException) {
                    reject(isException);
                }

                resolve(keys);
            });
        });
    },

    getAvailableKeys(useViewModel) {
        if (useViewModel) {
            return selectedElement.getViewModelKeys();
        } else {
            return selectedElement.getElementKeys();
        }
    },

    getGraph(useViewModel, property) {
        var command =
            "can.debug.formatGraph( " +
                "can.debug.getGraph( " +
                    ( useViewModel ? "can.viewModel( $0 )" : "$0" ) +
                    (property ? ", '" + property + "'" : "") +
                " )" +
            " )";


        return new Promise(function(resolve, reject) {
            pageEval(command, function(result, isException) {
                if (isException) {
                    reject(isException);
                }
                resolve(result);
            });
        });
    }
};

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
                selectedElement.hasViewModel()
                    .then(function(hasViewModel) {
                        selectedElement.getTagName()
                            .then(function(tagName) {
                                vm.selectedObj = "<" + tagName.toLowerCase() + ">" + (hasViewModel ? ".viewModel" : "");
                            });

                        selectedElement.getAvailableKeys(hasViewModel)
                            .then(function(keys) {
                                vm.availableKeys.replace(keys);
                            });

                        selectedElement.getGraph(hasViewModel, vm.selectedKey)
                            .then(function(data) {
                                vm.graphData = data;
                            });
                    });
            };

            // load initial data
            loadGraphData();

            // update graph data when user selects a new element
            chrome.devtools.panels.elements.onSelectionChanged.addListener(loadGraphData);

            // update graph data when user selects a new property
            this.listenTo("selectedKey", loadGraphData);
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
