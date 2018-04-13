// run an expression in the page
var pageEval = chrome.devtools.inspectedWindow.eval;

var POLLING_INTERVAL = 100;

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

    getViewModel: function getViewModel() {
        return new Promise(function(resolve, reject) {
            pageEval("$0[can.Symbol.for('can.viewModel')]", function(hasViewModel, isException) {
                if (hasViewModel) {
                    pageEval("can.viewModel($0).serialize()", function(enumerableViewModel, isException) {
                        if (isException) {
                            reject(isException);
                        }

                        pageEval("can.Reflect.getOwnKeys( can.viewModel( $0 ) )", function(viewModelKeys, isException) {
                            var missingKeysPromises = [];

                            for (var i=0; i<viewModelKeys.length; i++) {
                                missingKeysPromises.push( selectedElement.getKeyValue(viewModelKeys[i]) );
                            }

                            Promise.all(missingKeysPromises)
                                .then(function(missingKeysData) {
                                    return missingKeysData.reduce(function(data, cur) {
                                        return Object.assign({}, data, cur);
                                    }, enumerableViewModel);
                                })
                                .then(function(viewModel) {
                                    var sortedViewModel = {};

                                    Object.keys(viewModel).sort().forEach(function(key) {
                                        sortedViewModel[key] = viewModel[key];
                                    });

                                    return sortedViewModel;
                                })
                                .then(function(viewModel) {
                                    resolve(viewModel);
                                });
                        });
                    });
                } else {
                    resolve(null);
                }
            });
        });
    },

    getKeyValue: function getKeyValue(key) {
        return new Promise(function(resolve, reject) {
            var viewModel;

            pageEval("can.Reflect.getKeyValue( can.viewModel($0), '" + key + "')", function(keyValue, isException) {
                if (isException) {
                    reject(isException);
                }
                resolve({ [key]: keyValue });
            });
        });
    },

    getData: function getData() {
        return Promise.all([
            selectedElement.getTagName(),
            selectedElement.getViewModel()
        ])
        .then(function(data) {
            var tagName = data[0];
            var viewModel = data[1];

            var data = {
                tagName: tagName,
            };

            if (viewModel) {
                data.viewModel = viewModel;
            }

            return data;
        });
    },

    setViewModelKeyValue: function setViewModelKeyValue(key, value) {
        pageEval("can.Reflect.setKeyValue( can.viewModel($0), '" + key + "', '" + value + "')", function(keyValue, isException) {
            if (isException) {
                console.error(isException);
            }
        });
    }
};

can.Component.extend({
    tag: "viewmodel-sidebar",

    ViewModel: {
        // on load, display the data for the selected element
        // and set up polling so data will change when selected element changes
        // or element's data (viewModel, etc) changes
        connectedCallback() {
            var vm = this;

            var getSelectedElementData = function() {
                selectedElement.getData()
                    .then(function(elementData) {
                        can.Reflect.setKeyValue(vm, "tagName", elementData.tagName);

                        if (vm.viewModel) {
                            if (elementData.viewModel) {
                                vm.viewModel.update(elementData.viewModel);
                            } else {
                                can.Reflect.deleteKeyValue(vm, "viewModel");
                            }
                        } else {
                            can.Reflect.setKeyValue(vm, "viewModel", elementData.viewModel);
                        }
                    })
                    .then(function(elementData) {
                        // poll for changes
                        setTimeout(getSelectedElementData, POLLING_INTERVAL);
                    });
            };

            getSelectedElementData();
        },

        tagName: "string",
        viewModel: can.DefineMap,

        updateSelectedElementViewModel: function(key, value) {
            selectedElement.setViewModelKeyValue(key, value);
        }
    },

    view: `
        {{#unless(tagName)}}
            <h1>Select an Element to see its ViewModel</h1>
        {{else}}
            {{#unless(viewModel)}}
                <h1><{{tagName}}> does not have a ViewModel</h1>
            {{else}}
                <h1><{{tagName}}> ViewModel</h1>

                <form>
                    {{#each(viewModel, key=key value=value)}}
                        <p>
                            {{key}}:
                            <input
                                value:from="value"
                                on:change="scope.root.updateSelectedElementViewModel(key, scope.element.value)">
                        </p>
                    {{/each}}
                </form>
            {{/unless}}
        {{/unless}}
    `
});
