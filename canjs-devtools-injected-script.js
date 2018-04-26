// expose devtools namespace on the window
var __CANJS_DEVTOOLS__ = {
	getViewModelData: function(el) {
        // if $0 is not in this frame, el will be null
        if (!el) {
            return;
        }

        var can = el.ownerDocument.defaultView.can;

        // the page that $0 is in may not have can
        if (!can) {
            return;
        }

		var elementWithViewModel = (function getElementWithViewModel(el) {
			var vm = el[can.Symbol.for("can.viewModel")];
			return vm ?
				el :
				el.parentNode ?
				getElementWithViewModel(el.parentNode) :
				undefined;
		}(el));

		var getViewModelData = function(el) {
			var viewModel = can.viewModel(el);
			var viewModelData = viewModel.serialize();
			var viewModelKeys = can.Reflect.getOwnKeys( viewModel );

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
                type: "viewModel",
				tagName: elementWithViewModel.tagName,
				viewModel: getViewModelData( elementWithViewModel )
			};
		} else {
			return {
                type: "viewModel",
				tagName: el.tagName
			};
		}
	},

    register: function(detail) {
        var msg = new CustomEvent("__CANJS_DEVTOOLS_MSG__", {	
            detail: {
                type: "register",
                frameURL: window.location.href
            }
        });	

        document.dispatchEvent(msg);
    }
};

// register page's URL so that inspectedWindow.eval can call devtools functions in this frame
__CANJS_DEVTOOLS__.register();
