(function() {
    // CanJS modules set up by register function
    var viewModelSymbol,
        getOwnKeysSymbol,
        canReflect,
        canQueues,
        getGraph,
        formatGraph,
        mergeDeep;

    var nextId = 0;
    var nodeToIdMap = new WeakMap();
    var nodeToElementMap = new WeakMap();
    var componentTree = [];

    // expose devtools namespace on the window
    window.__CANJS_DEVTOOLS__ = {
        // flag indicating whether register has been called
        registered: false,

        // element selected in CanJS Devtools Panel
        $0: null,

        /*
         * methods called by devtools panels
         */
        register: function(can) {
            viewModelSymbol = can.Symbol.for("can.viewModel");
            getOwnKeysSymbol = can.Symbol.for("can.getOwnKeys");
            canReflect = can.Reflect;
            canQueues = can.queues;
            getGraph = can.getGraph;
            formatGraph = can.formatGraph;
            mergeDeep = can.mergeDeep;

            // register page so inspectedWindow.eval can call devtools functions in this frame
            var registrationEvent = new CustomEvent("__CANJS_DEVTOOLS_REGISTER__");

            document.dispatchEvent(registrationEvent);

            this.registered = true;
        },

        getViewModelData: function(el) {
            // if $0 is not in this frame, el will be null
            if (!el) {
                return this.makeIgnoreResponse("$0 is not in this frame");
            }

            // handle the user having devtools open and navigating to a page without can
            if (!this.registered) {
                return this.makeErrorResponse(this.NO_CAN_MSG);
            }

            var elementWithViewModel = this.getNearestElementWithViewModel(el);

            if (elementWithViewModel) {
                var viewModel = elementWithViewModel[viewModelSymbol];

                return this.makeSuccessResponse({
                    type: "viewModel",
                    tagName: this.getUniqueTagName(elementWithViewModel),
                    viewModel: this.getSerializedViewModel(viewModel),
                    namesByPath: this.getViewModelNamesByPath(viewModel)
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

            // handle the user having devtools open and navigating to a page without can
            if (!this.registered) {
                return this.makeErrorResponse(this.NO_CAN_MSG);
            }

            var elementWithViewModel = this.getNearestElementWithViewModel(el);

            if (elementWithViewModel) {
                canReflect.assignDeep(
                    elementWithViewModel[viewModelSymbol],
                    data
                );
            }
        },

        getBindingsGraphData: function(el, key) {
            // if $0 is not in this frame, el will be null
            if (!el) {
                return this.makeIgnoreResponse("$0 is not in this frame");
            }

            // handle the user having devtools open and navigating to a page without can
            if (!this.registered) {
                return this.makeErrorResponse(this.NO_CAN_MSG);
            }

            var hasViewModel = el[viewModelSymbol];
            var obj = hasViewModel ? hasViewModel : el;

            var graphData = formatGraph( getGraph(obj, key) );

            return this.makeSuccessResponse({
                availableKeys: hasViewModel ? this.getViewModelKeys(obj) : this.getElementKeys(el),
                selectedObj: "<" + el.tagName.toLowerCase() + ">" + (hasViewModel ? ".viewModel" : ""),
                graphData: graphData
            });
        },

        queuesStack: function() {
            if (!this.registered) {
                // don't show an error for this because unlike ViewModel and Graph functions,
                // this can't check if it is the correct frame by using $0.
                // So just assume it's not the correct frame if register hasn't been called.
                return this.makeIgnoreResponse(this.NO_CAN_MSG);
            }

            var stack = canQueues.stack();

            return this.makeSuccessResponse({
                frameURL: window.location.href,

                stack: stack.map(function(task) {
                    return {
                        queue: task.meta && task.meta.stack.name,
                        context: canReflect.getName(task.context),
                        functionName: canReflect.getName(task.fn),
                        metaLog: task.meta && task.meta.log && task.meta.log.join(" "),
                        metaReasonLog: task.meta && task.meta.reasonLog && task.meta.reasonLog.join(" ")
                    };
                })
            });
        },

        inspectTask(index) {
            if (!this.registered) {
                return this.makeErrorResponse(this.NO_CAN_MSG);
            }

            var stack = canQueues.stack();

            if (stack && stack[index] && stack[index].fn) {
                inspect(stack[index].fn);
            }
        },

        getComponentTreeData() {
            if (!this.registered) {
                // don't show an error for this because unlike ViewModel and Graph functions,
                // this can't check if it is the correct frame by using $0.
                // So just assume it's not the correct frame if register hasn't been called.
                return this.makeIgnoreResponse(this.NO_CAN_MSG);
            }

            // cache componetTree so it can be used to find nodes by Id
            componentTree = this.getComponentTreeDataForNode(document.body);

            return this.makeSuccessResponse({
                type: "componentTree",
                tree: componentTree
            });
        },

        selectComponentById(id) {
            var node = this.getNodeById(id);
            this.$0 = nodeToElementMap.get(node);
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
        getNearestElementWithViewModel: function(el) {
            var vm = el[viewModelSymbol];
            return vm ?
                    el :
                    el.parentNode ?
                        this.getNearestElementWithViewModel(el.parentNode) :
                        undefined;
        },

        getSerializedViewModel: function(viewModel) {
            var viewModelKeys = this.getViewModelKeys(viewModel);
            var viewModelData = {};
            var key = "";
            var value = undefined;
            var toStringed = "";

            for (var i=0; i<viewModelKeys.length; i++) {
                key = viewModelKeys[i];
                value = canReflect.getKeyValue(viewModel, key);

                if (typeof value === "object") {
                    // skip built ins (other than arrays, objects, primitives)
                    // this is primarily for DOM elements
                    toStringed = Object.prototype.toString.call(value);
                    if (toStringed !== '[object Object]' && toStringed.indexOf('[object ') !== -1) {
                        viewModelData[key] = {};
                    } else {
                        viewModelData[key] = canReflect.serialize(value);
                    }
                } else {
                    viewModelData[key] = value;
                }
            }

            return viewModelData;
        },

        getViewModelNamesByPath: function(viewModel, parentPath) {
            var viewModelKeys = this.getViewModelKeys(viewModel);
            var namesByPath = { };
            var key = "";
            var value = undefined;
            var path = "";

            for (var i=0; i<viewModelKeys.length; i++) {
                key = viewModelKeys[i];
                value = canReflect.getKeyValue(viewModel, key);
                if (value && typeof value === "object") {
                    path = `${parentPath ? parentPath + "." : ""}${key}`;
                    namesByPath[path] = canReflect.getName(value);
                    Object.assign(namesByPath, this.getViewModelNamesByPath(value, path));
                }
            }

            return namesByPath;
        },

        getViewModelKeys: function(viewModel) {
            var toStringed = Object.prototype.toString.call(viewModel);

            if (toStringed !== '[object Object]' && toStringed.indexOf('[object ') !== -1) {
                return [];
            }

            return canReflect.getOwnKeys( viewModel );
        },

        getElementKeys: function(el) {
            var keysSet = new Set([]);
            var keysMap = el.attributes;

            for (var i=0; i<keysMap.length; i++) {
                var key = keysMap[i].name.split(/:to|:from|:bind/)[0];
                key = key.split(":")[key.split(":").length - 1]
                keysSet.add(key);
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
        },

        getComponentTreeDataForNode(el) {
            var childList = [];

            var treeWalker = document.createTreeWalker(
                el,
                NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: function(node) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                },
                false
            );

            var node = treeWalker.firstChild();
            var nodeData;
            while(node) {
                if ("viewModel" in node) {
                    nodeData = {
                        tagName: node.tagName.toLowerCase(),
                        id: this.getNodeId(node),
                        children: this.getComponentTreeDataForNode(node)
                    };
                    // cache element so it can be retrieved later when
                    // a component is selected in component tree
                    nodeToElementMap.set(nodeData, node);
                    childList.push(nodeData);
                } else {
                    childList = childList.concat(
                        this.getComponentTreeDataForNode(node)
                    );
                }
                node = treeWalker.nextSibling();
            }

            return childList;
        },

        getNodeId(node) {
            var id = nodeToIdMap.get(node);

            if (!id) {
                id = nextId++;
                nodeToIdMap.set(node, id);
            }

            return id;
        },

        getNodeById(id) {
            var node;

            for(var i=0; i<componentTree.length; i++) {
                node = this.checkNodeAndChildren(componentTree[i], id);
            }

            return node;
        },

        checkNodeAndChildren(parent, id) {
            if (parent.id === id) {
                return parent;
            }

            var found;

            for(var i=0; i<parent.children.length; i++) {
                found = this.checkNodeAndChildren(parent.children[i], id);
                if (found) {
                    return found;
                }
            }
        }
    };
}());
