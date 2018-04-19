// run an expression in the page
var pageEval = chrome.devtools.inspectedWindow.eval;

var POLLING_INTERVAL = 100;

// tostring a function and wrap in an IIFE so it can be evaled
var iifeify = function(fn) {
	var args = Array.prototype.slice.call(arguments, 1);
    return "(" + fn.toString() + "(" +
		args.map(function(arg) { return "'" + arg + "'"; }).join(", ") +
	"))";
};

// helpers for working with the selected element (`$0`)
var selectedElement = {
    getElementWithViewModelData: function() {
		var elementWithViewModel = (function getElementWithViewModel(el) {
			el = el ? el : $0;
			var vm = el[can.Symbol.for("can.viewModel")];
			return vm ?
				el :
				el.parentNode ?
				getElementWithViewModel(el.parentNode) :
				undefined;
		}());

		var getViewModelData = function(el) {
			var viewModel = can.viewModel(el);
			var viewModelData = viewModel.serialize();
			var viewModelKeys = can.Reflect.getOwnKeys( can.viewModel( el ) );

			for (var i=0; i<viewModelKeys.length; i++) {
				var key = viewModelKeys[i];
				if (!viewModelData[ key ]) {
					viewModelData[key] = can.Reflect.getKeyValue( viewModel, key );
				}
			}

            var sortedViewModel = {};

            Object.keys(viewModelData).sort().forEach(function(key) {
                sortedViewModel[key] = viewModelData[key];
            });

            return sortedViewModel;
		};

        if (elementWithViewModel) {
            return {
				tagName: elementWithViewModel.tagName,
                viewModel: getViewModelData( elementWithViewModel )
            };
        } else {
            return {
                tagName: $0.tagName
            };
        }
    },

    getData: function getData() {
        return new Promise(function(resolve, reject) {
            pageEval(iifeify( selectedElement.getElementWithViewModelData ), function(data, isException) {
				if (isException) {
                    reject(isException);
                }

                resolve(data);
            });
        });
    },

    setElementWithViewModelKeyValue: function(key, value) {
		var elementWithViewModel = (function getElementWithViewModel(el) {
			el = el ? el : $0;
			var vm = el[can.Symbol.for("can.viewModel")];
			return vm ?
				el :
				el.parentNode ?
				getElementWithViewModel(el.parentNode) :
				undefined;
		}());

		var viewModel = can.viewModel( elementWithViewModel );
		can.Reflect.setKeyValue( viewModel, key, value );
    },

    setViewModelKeyValue: function setViewModelKeyValue(key, value) {
        return new Promise(function(resolve, reject) {
            pageEval(iifeify( selectedElement.setElementWithViewModelKeyValue, key, value ), function(data, isException) {
				if (isException) {
                    reject(isException);
                }

                resolve(data);
            });
        });
    }
};

can.Component.extend({
    tag: "canjs-devtools-viewmodel-editor",

    view: `
        <viewmodel-editor
			tagName:from="tagName"
			viewModelData:from="viewModelData"
			setKeyValue:from="setKeyValue"
        ></viewmodel-editor>
    `,

    ViewModel: {
        tagName: "string",

        viewModelData: "observable",

        setKeyValue: selectedElement.setViewModelKeyValue,

        connectedCallback() {
            var vm = this;
            var timeoutId;

            var getSelectedElementData = function() {
                selectedElement.getData()
                    .then(function(elementData) {
                        can.Reflect.setKeyValue(vm, "tagName", elementData.tagName);

                        if (vm.viewModelData) {
                            if (elementData.viewModel) {
                                can.Reflect.update(vm.viewModelData, elementData.viewModel);
                            } else {
                                can.Reflect.deleteKeyValue(vm, "viewModelData");
                            }
                        } else {
                            can.Reflect.setKeyValue(vm, "viewModelData", elementData.viewModel);
                        }
                    })
                    .then(function(elementData) {
                        // poll for changes
                        timeoutId = setTimeout(getSelectedElementData, POLLING_INTERVAL);
                    });
            };

            getSelectedElementData();

            return function disconnect() {
                clearTimeout(timeoutId);
            };
        }
    }
});
