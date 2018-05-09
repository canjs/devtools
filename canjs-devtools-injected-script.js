// expose devtools namespace on the window
var __CANJS_DEVTOOLS__ = {
    /*
     * methods called by devtools panels
     */
	getViewModelData: function(el) {
        // if $0 is not in this frame, el will be null
        if (!el) {
            return this.makeIgnoreResponse("$0 is not in this frame");
        }

        var can = el.ownerDocument.defaultView.can;

        // the page that $0 is in may not have can
        if (!can) {
            return this.makeErrorResponse("`window.can` is not defined");
        }

        var elementWithViewModel = this.getNearestElementWithViewModel(el, can);

		if (elementWithViewModel) {
			return this.makeSuccessResponse({
                type: "viewModel",
				tagName: elementWithViewModel.tagName,
				viewModel: this.getSerializedViewModel( elementWithViewModel, can )
			});
		} else {
            return this.makeErrorResponse("<" + el.tagName.toLowerCase() + "> does not have a viewModel");
		}
    },

    setViewModelKeyValue: function(el, key, value) {
        // if $0 is not in this frame, el will be null
        if (!el) {
            return this.makeIgnoreResponse("$0 is not in this frame");
        }

        var can = el.ownerDocument.defaultView.can;

        // the page that $0 is in may not have can
        if (!can) {
            return this.makeErrorResponse("`window.can` is not defined");
        }

        var elementWithViewModel = this.getNearestElementWithViewModel(el, can);

        if (elementWithViewModel) {
            can.Reflect.setKeyValue( can.viewModel( elementWithViewModel ), key, value);
        }
    },

    getBindingsGraphData: function(el, key) {
        // if $0 is not in this frame, el will be null
        if (!el) {
            return;
        }

        var can = el.ownerDocument.defaultView.can;

        // the page that $0 is in may not have can
        if (!can) {
            return;
        }

        var hasViewModel = el[can.Symbol.for("can.viewModel")];
        var obj = hasViewModel ? can.viewModel(el) : el;

        var graphData;

        if (can.debug && can.debug.getGraph && can.debug.formatGraph) {
            graphData = can.debug.formatGraph( can.debug.getGraph( obj, key ) );
        }

        return {
            availableKeys: hasViewModel ? this.getViewModelKeys(el, can) : this.getElementKeys(el),
            selectedObj: "<" + el.tagName.toLowerCase() + ">" + (hasViewModel ? ".viewModel" : ""),
            graphData: graphData
        };
    },

    queuesStack: function() {
        var can = window.can;

        if (!can) {
            // don't show an error for this
            return;
        }

        var stack = can.queues.stack();

        return stack.map(function(task) {
            return {
                queue: task.meta.stack.name,
                context: can.Reflect.getName(task.context),
                fn: can.Reflect.getName(task.fn),
                reason: task.meta && task.meta.reasonLog && task.meta.reasonLog.join(" ")
            };
        });
    },

    inspectTask(index) {
        var can = window.can;

        if (!can) {
            return this.makeErrorResponse("`window.can` is not defined");
        }

        var stack = can.queues.stack();

        if (stack && stack[index] && stack[index].fn) {
            inspect( stack[index].fn );
        }
    },

    /*
     * methods used to build responses
     */
    makeResponse(status, detail) {
        return {
            status: status,
            detail: detail
        };
    },

    makeIgnoreResponse(detail) {
        return this.makeResponse("ignore", detail);
    },

    makeErrorResponse: function(detail) {
        return this.makeResponse("error", detail);
    },

    makeSuccessResponse: function(detail) {
        return this.makeResponse("success", detail);
    },

    /*
     * helper methods
     */
    getNearestElementWithViewModel: function(el, can) {
        var vm = el[can.Symbol.for("can.viewModel")];
        return vm ?
            el :
            el.parentNode ?
            this.getNearestElementWithViewModel(el.parentNode, can) :
            undefined;
    },

    getSerializedViewModel: function(el, can) {
        var viewModel = can.viewModel(el);
        var viewModelData = viewModel.serialize();

        // if viewModel Type supports getOwnKeys, add any non-enumerable properties
        if (viewModel[ can.Symbol.for( "can.getOwnKeys" ) ]) {
            var viewModelKeys = can.Reflect.getOwnKeys( viewModel );

            for (var i=0; i<viewModelKeys.length; i++) {
                var key = viewModelKeys[i];
                if (!viewModelData[ key ]) {
                    viewModelData[key] = can.Reflect.getKeyValue( viewModel, key );
                }
            }
        }

        // sort viewModel data in alphabetical order
        var sortedViewModel = {};

        Object.keys(viewModelData).sort().forEach(function(key) {
            sortedViewModel[key] = viewModelData[key];
        });

        return sortedViewModel;
    },


    getViewModelKeys: function(el, can) {
        return Object.keys( this.getSerializedViewModel(el, can) );
    },

    getElementKeys: function(el) {
        var keysSet = new Set([]);
        var keysMap = el.attributes;

        for (var i=0; i<keysMap.length; i++) {
            var key = keysMap[i].name.split(/:to|:from|:bind/)[0];
            key = key.split(":")[key.split(":").length - 1]
            keysSet.add( key );
        }

        return Array.from(keysSet);
    }
};

// register page so inspectedWindow.eval can call devtools functions in this frame
document.dispatchEvent( new CustomEvent("__CANJS_DEVTOOLS_REGISTER__") );
