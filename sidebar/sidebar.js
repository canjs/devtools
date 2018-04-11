// run an expression in the page
var pageEval = chrome.devtools.inspectedWindow.eval;

var POLLING_INTERVAL = 100;

// helpers for working with the selected element $0
var selectedElement = {
    displayData: function displayData(elementData) {
        selectedElement.getData()
            .then(function(elementData) {
                var tagName = elementData.tagName;
                var viewModel = elementData.viewModel;

                if (!elementData.viewModel) {
                    var header = document.createElement("h1");
                    var headerText = document.createTextNode("<" + tagName.toLowerCase() + "> does not have a ViewModel");
                    header.appendChild(headerText);

                    document.body.innerHTML = "";
                    document.body.appendChild(header);
                } else {
                    var header = document.createElement("h1");
                    var headerText = document.createTextNode("<" + tagName.toLowerCase() + "> ViewModel");
                    header.appendChild(headerText);

                    document.body.innerHTML = "";
                    document.body.appendChild(header);

                    Object.keys(viewModel).sort().forEach(function(key) {
                        var p = document.createElement("p");
                        var keyText = document.createTextNode(key + ": ");
                        var valueText = document.createTextNode(viewModel[key]);

                        p.appendChild(keyText);
                        p.appendChild(valueText);

                        document.body.appendChild(p);
                    });
                }
            })
            .then(function(elementData) {
                // poll for changes
                setTimeout(selectedElement.displayData, POLLING_INTERVAL);
            });
    },

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

            return {
                tagName: tagName,
                viewModel: viewModel
            };
        });
    }
};

// on load, display the data for the selected element
// this will set up polling so data will change when selected element changes
// or element's data (viewModel, etc) changes
selectedElement.displayData();
