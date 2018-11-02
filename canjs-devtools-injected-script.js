// expose devtools namespace on the window
var __CANJS_DEVTOOLS__ = {
    /*
     * object containing CanJS modules that are used by methods below
     * this is set by can-debug calling `register`
     */
    canNamespace: null,

    /*
     * methods called by devtools panels
     */
    register: function(canNamespace) {
        this.canNamespace = canNamespace;

        // register page so inspectedWindow.eval can call devtools functions in this frame
        var registrationEvent = new CustomEvent("__CANJS_DEVTOOLS_REGISTER__");

        document.dispatchEvent( registrationEvent );
    },

	getViewModelData: function(el) {
        // if $0 is not in this frame, el will be null
        if (!el) {
            return this.makeIgnoreResponse("$0 is not in this frame");
        }

        var can = this.canNamespace;

        // handle the user having devtools open and navigating to a page without can
        if (!can) {
            return this.makeErrorResponse(this.NO_CAN_MSG);
        }

        var elementWithViewModel = this.getNearestElementWithViewModel(el, can);

		if (elementWithViewModel) {
			return this.makeSuccessResponse({
                type: "viewModel",
				tagName: this.getUniqueTagName(elementWithViewModel),
				viewModel: this.getSerializedViewModel( elementWithViewModel, can )
			});
		} else {
            return this.makeIgnoreResponse("&lt;" + el.tagName.toLowerCase() + "&gt; does not have a viewModel");
		}
    },

    updateViewModel: function(el, data) {
        // if $0 is not in this frame, el will be null
        if (!el) {
            return this.makeIgnoreResponse("$0 is not in this frame");
        }

        var can = this.canNamespace;

        // handle the user having devtools open and navigating to a page without can
        if (!can) {
            return this.makeErrorResponse(this.NO_CAN_MSG);
        }

        var elementWithViewModel = this.getNearestElementWithViewModel(el, can);

        if (elementWithViewModel) {
            can.Reflect.assignDeep(
                elementWithViewModel[can.Symbol.for("can.viewModel")],
                data
            );
        }
    },

    getBindingsGraphData: function(el, key) {
        // if $0 is not in this frame, el will be null
        if (!el) {
            return this.makeIgnoreResponse("$0 is not in this frame");
        }

        var can = this.canNamespace;

        // handle the user having devtools open and navigating to a page without can
        if (!can) {
            return this.makeErrorResponse(this.NO_CAN_MSG);
        }

        var hasViewModel = el[can.Symbol.for("can.viewModel")];
        var obj = hasViewModel ? hasViewModel : el;

        var graphData = can.formatGraph( can.getGraph( obj, key ) );


        return this.makeSuccessResponse({
            availableKeys: hasViewModel ? this.getViewModelKeys(el, can) : this.getElementKeys(el),
            selectedObj: "<" + el.tagName.toLowerCase() + ">" + (hasViewModel ? ".viewModel" : ""),
            graphData: graphData
        });
    },

    queuesStack: function() {
        var can = this.canNamespace;

        if (!can) {
            // don't show an error for this because unlike ViewModel and Graph functions,
            // this can't check if it is the correct frame by using $0.
            // So just assume it's not the correct frame if `window.can` is undefined.
            return this.makeIgnoreResponse(this.NO_CAN_MSG);
        }

        var stack = can.queues.stack();

        return this.makeSuccessResponse({
            frameURL: window.location.href,

            stack: stack.map(function(task) {
                return {
                    queue: task.meta.stack.name,
                    context: can.Reflect.getName(task.context),
                    fn: can.Reflect.getName(task.fn),
                    reason: task.meta && task.meta.reasonLog && task.meta.reasonLog.join(" ")
                };
            })
        });
    },

    inspectTask(index) {
        var can = this.canNamespace;

        if (!can) {
            return this.makeErrorResponse(this.NO_CAN_MSG);
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

    NO_CAN_MSG: 'CanJS was not found on this page. If it is using CanJS, see the <a target="_blank" href="https://canjs.com/doc/guides/debugging.html#InstallingCanJSDevtools">installation instructions</a>.',

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
        var viewModel = el[can.Symbol.for("can.viewModel")];
        var viewModelData = typeof viewModel.serialize === "function" ?
            viewModel.serialize() :
            JSON.parse( JSON.stringify(viewModel) );

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
    },

    getUniqueTagName: function(el) {
        var tagName = el.tagName.toLowerCase();
        var els = document.querySelectorAll(tagName);

        tagName = "<" + tagName + ">";

        if (els.length > 1) {
            var index = 0;

            Array.prototype.some.call(els, function(currentEl, currentIndex) {
                if(currentEl === el) {
                    index = currentIndex;
                    return true;
                }
            });

            tagName = tagName + "[" + index + "]";
        }

        return tagName;
    }
};
