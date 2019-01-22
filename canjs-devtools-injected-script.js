(function() {
    // CanJS modules set up by register function
    let viewModelSymbol,
        getOwnKeysSymbol,
        canObservation,
        canQueues,
        canReflect,
        formatGraph,
        getGraph,
        mergeDeep;

    // component tree variables
    let nextNodeId = 0;
    let componentTree = [];
    const nodeToIdMap = new WeakMap();
    const nodeToElementMap = new WeakMap();

    // breakpoints variables
    let nextBreakpointId = 0;
    const breakpoints = [];
    const breakpointToObservableMap = new WeakMap();
    const noop = () => {};

    // helper functions
    const getObjAtKey = (obj, key) => {
        if (!key) {
            return obj;
        }

        const parts = key.split(".");

        return parts.reduce((parent, key) => {
            return canReflect.getKeyValue(parent, key);
        }, obj);
    };

    const getLastParent = (obj, key) => {
        return getObjAtKey(obj, key.split(".").slice(0, -1).join("."));
    };

    const getLastKey = (path) => {
        return path.split(".").pop();
    };

    const getIndexOfItemInArrayWithId = (arr, id) => {
        let index = -1;

        arr.some((item, i) => {
            if (item.id === id) {
                index = i;
                return true;
            }
        });

        return index;
    };

    // expose devtools namespace on the window
    window.__CANJS_DEVTOOLS__ = {
        // flag indicating whether register has been called
        registered: false,

        // element selected in CanJS Devtools Panel
        $0: null,

        /*
         * methods called by devtools panels
         */
        register(can) {
            viewModelSymbol = can.Symbol.for("can.viewModel");
            getOwnKeysSymbol = can.Symbol.for("can.getOwnKeys");
            canObservation = can.Observation;
            canQueues = can.queues;
            canReflect = can.Reflect;
            formatGraph = can.formatGraph;
            getGraph = can.getGraph;
            mergeDeep = can.mergeDeep;

            // register page so inspectedWindow.eval can call devtools functions in this frame
            const registrationEvent = new CustomEvent("__CANJS_DEVTOOLS_REGISTER__");

            document.dispatchEvent(registrationEvent);

            this.registered = true;
        },

        getViewModelData(el, options) {
            // if $0 is not in this frame, el will be null
            if (!el) {
                return this.makeIgnoreResponse("$0 is not in this frame");
            }

            // handle the user having devtools open and navigating to a page without can
            if (!this.registered) {
                return this.makeErrorResponse(this.NO_CAN_MSG);
            }

            const elementWithViewModel = this.getNearestElementWithViewModel(el);

            if (!elementWithViewModel) {
                return this.makeIgnoreResponse("&lt;" + el.tagName.toLowerCase() + "&gt; does not have a viewModel");
            }

            const vm = elementWithViewModel[viewModelSymbol];
            const { viewModel, namesByPath, messages, undefineds } = this.getSerializedViewModelData(vm, options);

            return this.makeSuccessResponse({
                type: "viewModel",
                tagName: this.getUniqueTagName(elementWithViewModel),
                viewModel,
                namesByPath,
                messages,
                undefineds
            });
        },

        updateViewModel(el, patches) {
            // if $0 is not in this frame, el will be null
            if (!el) {
                return this.makeIgnoreResponse("$0 is not in this frame");
            }

            // handle the user having devtools open and navigating to a page without can
            if (!this.registered) {
                return this.makeErrorResponse(this.NO_CAN_MSG);
            }

            const elementWithViewModel = this.getNearestElementWithViewModel(el);

            if (elementWithViewModel) {
                const viewModel = elementWithViewModel[viewModelSymbol];
                let parentObj, lastKey;

                patches.forEach(({ type, key, value, index, deleteCount, insert }) => {
                    switch(type) {
                        case "add":
                        case "set":
                            parentObj = getLastParent(viewModel, key);
                            lastKey = getLastKey(key);
                            canReflect.setKeyValue(parentObj, lastKey, value);
                            break;
                        case "delete":
                            parentObj = getLastParent(viewModel, key);
                            lastKey = getLastKey(key);
                            canReflect.deleteKeyValue(parentObj, lastKey);
                            break;
                        case "splice":
                            parentObj = getObjAtKey(viewModel, key);
                            parentObj.splice(index, deleteCount, ...insert);
                            break;
                    }
                });
            }
        },

        getBindingsGraphData(el, key) {
            // if $0 is not in this frame, el will be null
            if (!el) {
                return this.makeIgnoreResponse("$0 is not in this frame");
            }

            // handle the user having devtools open and navigating to a page without can
            if (!this.registered) {
                return this.makeErrorResponse(this.NO_CAN_MSG);
            }

            const hasViewModel = el[viewModelSymbol];
            const obj = hasViewModel ? hasViewModel : el;

            const graphData = formatGraph( getGraph(obj, key) );

            return this.makeSuccessResponse({
                availableKeys: hasViewModel ? this.getViewModelKeys(obj) : this.getElementKeys(el),
                selectedObj: "<" + el.tagName.toLowerCase() + ">" + (hasViewModel ? ".viewModel" : ""),
                graphData: graphData
            });
        },

        queuesStack() {
            if (!this.registered) {
                // don't show an error for this because unlike ViewModel and Graph functions,
                // this can't check if it is the correct frame by using $0.
                // So just assume it's not the correct frame if register hasn't been called.
                return this.makeIgnoreResponse(this.NO_CAN_MSG);
            }

            const stack = canQueues.stack();

            return this.makeSuccessResponse({
                frameURL: window.location.href,

                stack: stack.map((task) => {
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

            const stack = canQueues.stack();

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
            componentTree = this.getComponentTreeDataForNode(
                document.body,
                this.getNearestElementWithViewModel(window.$0)
            );

            return this.makeSuccessResponse({
                type: "componentTree",
                tree: componentTree
            });
        },

        selectComponentById(id) {
            const node = this.getNodeById(id);
            this.$0 = nodeToElementMap.get(node);
        },

        getBreakpoints() {
            return this.makeSuccessResponse({
                breakpoints
            });
        },

        addBreakpoint({ expression, observation, error }) {
            if (error) {
                return this.makeErrorResponse(error);
            }
            const breakpoint = {
                id: nextBreakpointId++,
                expression,
                enabled: true,
            };

            breakpoints.push(breakpoint);

            if (observation) {
                Object.defineProperty(observation.dependencyChange, "name", {
                    value: `${expression} debugger`
                });
                canReflect.onValue(observation, noop);

                breakpointToObservableMap.set(
                    breakpoint,
                    observation
                );
            }

            return this.getBreakpoints();
        },

        toggleBreakpoint(id) {
            const index = getIndexOfItemInArrayWithId(breakpoints, id);
            const breakpoint = breakpoints[index];
            breakpoint.enabled = !breakpoint.enabled;

            const observation = breakpointToObservableMap.get(breakpoint);
            if (observation) {
                if (breakpoint.enabled) {
                    canReflect.onValue(observation, noop);
                } else {
                    canReflect.offValue(observation, noop);
                }
            }

            return this.getBreakpoints();
        },

        deleteBreakpoint(id) {
            const index = getIndexOfItemInArrayWithId(breakpoints, id);
            const breakpoint = breakpoints[index];
            const observation = breakpointToObservableMap.get(breakpoint);
            if (observation) {
                canReflect.offValue(observation);
            }
            breakpoints.splice(index, 1);
            return this.getBreakpoints();
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

        makeErrorResponse(detail) {
            return this.makeResponse("error", detail);
        },

        makeSuccessResponse(detail) {
            return this.makeResponse("success", detail);
        },

        NO_CAN_MSG: 'CanJS was not found on this page. If it is using CanJS, see the <a target="_blank" href="https://canjs.com/doc/guides/debugging.html#InstallingCanJSDevtools">installation instructions</a>.',

        /*
         * helper methods
         */
        getNearestElementWithViewModel(el) {
            if (!el) {
                return undefined;
            }

            const vm = el[viewModelSymbol];
            return vm ?
                    el :
                    el.parentNode ?
                        this.getNearestElementWithViewModel(el.parentNode) :
                        undefined;
        },

        getSerializedViewModelData(viewModel, { expandedKeys = [] } = {}, parentPath = "") {
            const viewModelKeys = this.getViewModelKeys(viewModel);
            const viewModelData = {};
            const namesByPath = {};
            const messages = {};
            const undefineds = [];

            if (viewModelKeys.length === 0) {
                const type = canReflect.isObservableLike(viewModel) ?
                    (canReflect.isMoreListLikeThanMapLike(viewModel) ? "List" : "Map") :
                    Array.isArray(viewModel) ? "Array" : "Object";

                messages[parentPath] = { type: "info", message: `${type} is empty` };
            }

            for (let i=0; i<viewModelKeys.length; i++) {
                let key = viewModelKeys[i];
                let path = `${parentPath ? parentPath + "." : ""}${key}`;
                let value;
                try {
                    value = canReflect.getKeyValue(viewModel, key);
                } catch(e) {
                    // handle non-serializable values (such as recursive and circular structures)
                    value = {};

                    // add error message for key
                    messages[path] = {
                        type: "error",
                        message: 'Error getting value of "' + path + '": ' + e.message
                    };
                }

                // don't serialize functions
                if (typeof value === "function") {
                    viewModelData[key] = {};
                    namesByPath[path] = "function";
                    messages[path] = {
                        type: "info",
                        message: value.toString()
                    };
                    continue;
                }

                if (value === null) {
                    viewModelData[key] = null;
                    continue;
                }

                if (value === undefined) {
                    undefineds.push(path);
                }

                if (typeof value === "object") {
                    viewModelData[key] = {};
                    namesByPath[path] = canReflect.getName(value);

                    if (value instanceof Element) {
                        messages[path] = {
                            type: "info",
                            message: "CanJS Devtools does not expand HTML Elements"
                        };
                        continue;
                    }

                    // get serialized data for children of expanded keys
                    if (expandedKeys.indexOf(path) !== -1) {
                        let {
                            viewModel: childViewModel,
                            namesByPath: childNamesByPath,
                            messages: childMessages,
                            undefineds: childUndefineds
                        } = this.getSerializedViewModelData(value, { expandedKeys }, path );

                        viewModelData[key] = childViewModel;
                        Object.assign(namesByPath, childNamesByPath);
                        Object.assign(messages, childMessages);
                        undefineds.splice(undefineds.length, 0, ...childUndefineds);
                    }
                } else {
                    viewModelData[key] = value;
                }
            }

            return {
                viewModel: viewModelData,
                namesByPath,
                messages,
                undefineds
            };
        },

        getViewModelKeys(viewModel) {
            if (canReflect.isListLike(viewModel)) {
                return canReflect.getOwnEnumerableKeys( viewModel )
            }

            if (canReflect.isMapLike(viewModel)) {
                return canReflect.getOwnKeys( viewModel )
            }
        },

        getElementKeys(el) {
            const keysSet = new Set([]);
            const keysMap = el.attributes;

            for (let i=0; i<keysMap.length; i++) {
                let key = keysMap[i].name.split(/:to|:from|:bind/)[0];
                key = key.split(":")[key.split(":").length - 1]
                keysSet.add(key);
            }

            return Array.from(keysSet);
        },

        getUniqueTagName(el) {
            let tagName = el.tagName.toLowerCase();
            const els = document.querySelectorAll(tagName);
            tagName = `<${tagName}>`;

            if (els.length > 1) {
                let index = 0;

                Array.prototype.some.call(els, (currentEl, currentIndex) => {
                    if(currentEl === el) {
                        index = currentIndex;
                        return true;
                    }
                });

                tagName = `${tagName}[${index}]`;
            }

            return tagName;
        },

        getComponentTreeDataForNode(el, selectedComponent) {
            let childList = [];

            const treeWalker = document.createTreeWalker(
                el,
                NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode(node) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                },
                false
            );

            let node = treeWalker.firstChild();
            while(node) {
                if ("viewModel" in node) {
                    let nodeData = {
                        tagName: node.tagName.toLowerCase(),
                        id: this.getNodeId(node),
                        children: this.getComponentTreeDataForNode(node, selectedComponent),
                        selected: node === selectedComponent
                    };
                    // cache element so it can be retrieved later when
                    // a component is selected in component tree
                    nodeToElementMap.set(nodeData, node);
                    childList.push(nodeData);
                } else {
                    childList = childList.concat(
                        this.getComponentTreeDataForNode(node, selectedComponent)
                    );
                }
                node = treeWalker.nextSibling();
            }

            return childList;
        },

        getNodeId(node) {
            let id = nodeToIdMap.get(node);

            if (!id) {
                id = nextNodeId++;
                nodeToIdMap.set(node, id);
            }

            return id;
        },

        getNodeById(id) {
            for(let i=0; i<componentTree.length; i++) {
                let node = this.checkNodeAndChildren(componentTree[i], id);
                if (node) {
                    return node;
                }
            }
        },

        checkNodeAndChildren(parent, id) {
            if (parent.id === id) {
                return parent;
            }

            for(let i=0; i<parent.children.length; i++) {
                let found = this.checkNodeAndChildren(parent.children[i], id);
                if (found) {
                    return found;
                }
            }
        },

        get canObservation() {
            return canObservation || window.can.Observation;
        },

        get canReflect() {
            return canReflect;
        },

        get canQueues() {
            return canQueues;
        }
    };
}());
