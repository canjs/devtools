import { Component, DefineMap, DefineList, Reflect } from "../node_modules/can-devtools-components/dist/panel.mjs";

import helpers from "../canjs-devtools-helpers.mjs";

export default Component.extend({
    tag: "canjs-devtools-panel",

    view: `
        {{# if(error) }}
            <h2>{{{error}}}</h2>
        {{ else }}
            <components-panel
                componentTree:to="componentTree"
                selectedNode:to="selectedNode"
                viewModelData:bind="viewModelData"
                typeNamesData:bind="typeNamesData"
                messages:bind="messages"
                undefineds:bind="undefineds"
                viewModelEditorError:bind="viewModelEditorError"
                updateValues:from="updateValues"
                expandedKeys:to="expandedKeys"
                breakpoints:bind="breakpoints"
                breakpointsError:bind="breakpointsError"
                addBreakpoint:from="addBreakpoint"
                toggleBreakpoint:from="toggleBreakpoint"
                deleteBreakpoint:from="deleteBreakpoint"
            ></components-panel>
        {{/ if }}
    `,

    ViewModel: {
        connectedCallback() {
            const vm = this;
            let stopRefreshingViewModelData = () => {};

            vm.listenTo("selectedNode", (ev, node) => {
                if (node && "id" in node) {
                    helpers.runDevtoolsFunction({
                        fnString: `selectComponentById(${node.id})`
                    });
                }

                // teardown old polling
                stopRefreshingViewModelData();

                stopRefreshingViewModelData = helpers.runDevtoolsFunction({
                    fn: () => {
                        return "getViewModelData(__CANJS_DEVTOOLS__.$0, { expandedKeys: [ '" +
                                    this.expandedKeys.serialize().join("', '") +
                                "' ] } )";
                    },
                    refreshInterval: 100,
                    success(result) {
                        const status = result.status;
                        const detail = result.detail;

                        switch(status) {
                            case "ignore":
                                break;
                            case "error":
                                vm.viewModelEditorError = detail;
                                break;
                            case "success":
                                Reflect.updateDeep(vm.viewModelData, detail.viewModelData || {});
                                vm.typeNamesData = detail.typeNames || {};
                                vm.messages = detail.messages || {};
                                vm.undefineds = detail.undefineds || [];
                                break;
                        }
                    }
                });
            });

            const stopRefreshingComponentTree = helpers.runDevtoolsFunction({
                fnString: "getComponentTreeData()",
                refreshInterval: 2000,
                success(result) {
                    const status = result.status;
                    const detail = result.detail;

                    switch(status) {
                        case "ignore":
                            break;
                        case "error":
                            vm.breakpointsError = detail;
                            break;
                        case "success":
                            vm.componentTree.updateDeep(detail.tree || []);
                            break;
                    };
                }
            });

            // get breakpoints data
            helpers.runDevtoolsFunction({
                fnString: "getBreakpoints()",
                refreshInterval: 100,
                success(result) {
                    const status = result.status;
                    const detail = result.detail;

                    if (status === "success") {
                        vm.breakpoints.updateDeep(detail.breakpoints || []);
                    }
                }
            });

            return () => {
                stopRefreshingComponentTree();
                stopRefreshingViewModelData();
            };
        },

        // general component data
        error: {
            value({ listenTo, lastSet, resolve }) {
                listenTo(lastSet, resolve);
                // when a new node is selected, reset the error
                listenTo("selectedNode", () => {
                    resolve(undefined);
                });
            }
        },

        // Component Tree data
        componentTree: DefineList,
        selectedNode: DefineMap,

        // ViewModel Editor data
        viewModelData: {
            value({ listenTo, lastSet, resolve }) {
                listenTo(lastSet, resolve);
                // when a new node is selected, reset the data
                listenTo("selectedNode", () => {
                    resolve(new DefineMap({}) );
                });
            }
        },
        typeNamesData: {
            value({ listenTo, lastSet, resolve }) {
                listenTo(lastSet, resolve);
                // when a new node is selected, reset the data
                listenTo("selectedNode", () => {
                    resolve(new DefineMap({}) );
                });
            }
        },
        messages: {
            value({ listenTo, lastSet, resolve }) {
                listenTo(lastSet, resolve);
                // when a new node is selected, reset the data
                listenTo("selectedNode", () => {
                    resolve(new DefineMap({}) );
                });
            }
        },
        undefineds: {
            value({ listenTo, lastSet, resolve }) {
                listenTo(lastSet, resolve);
                // when a new node is selected, reset the data
                listenTo("selectedNode", () => {
                    resolve(new DefineList({}) );
                });
            }
        },
        expandedKeys: DefineList,
        viewModelEditorError: "string",

        // Breakpoints Panel data
        breakpointsError: {
            value({ listenTo, lastSet, resolve }) {
                listenTo(lastSet, resolve);
                // when a new node is selected, reset the error
                listenTo("selectedNode", () => {
                    resolve(undefined);
                });
            }
        },
        breakpoints: DefineList,

        // ViewModel Editor functions
        updateValues(data) {
            helpers.runDevtoolsFunction({
                fnString: "updateViewModel(__CANJS_DEVTOOLS__.$0, " + JSON.stringify(data) + ")"
            });
        },

        // Breakpoints Panel functions
        addBreakpoint(expression) {
            const vm = this;

            helpers.runDevtoolsFunction({
                fnString: `addBreakpoint(
    ${ helpers.getBreakpointEvalString(expression) }
)`,
                success(result) {
                    const status = result.status;
                    const detail = result.detail;

                    switch(status) {
                        case "error":
                            vm.breakpointsError = detail;
                            break;
                        case "success":
                            vm.breakpoints = detail.breakpoints;
                            break;
                    }
                }
            });
        },

        toggleBreakpoint(breakpoint) {
            const vm = this;

            helpers.runDevtoolsFunction({
                fnString: `toggleBreakpoint( ${breakpoint.id} )`,
                success(result) {
                    const status = result.status;
                    const detail = result.detail;

                    if (status === "success") {
                        vm.breakpoints = detail.breakpoints;
                    }
                }
            });
        },

        deleteBreakpoint(breakpoint) {
            const vm = this;

            helpers.runDevtoolsFunction({
                fnString: `deleteBreakpoint( ${breakpoint.id} )`,
                success(result) {
                    const status = result.status;
                    const detail = result.detail;

                    if (status === "success") {
                        vm.breakpoints = detail.breakpoints;
                    }
                }
            });
        }
    }
});
