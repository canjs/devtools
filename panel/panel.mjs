import { Component, DefineMap, DefineList, Reflect } from "../node_modules/can-devtools-components/dist/panel.mjs";

Component.extend({
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
                updateValues:from="updateValues"
                expandedKeys:to="expandedKeys"
            ></components-panel>
        {{/ if }}
    `,

    ViewModel: {
        connectedCallback() {
            var vm = this;
            var stopRefreshingViewModelData = () => {};

            const resetViewModelData = () => {
                vm.error = undefined;
                vm.viewModelData = {};
                vm.typeNamesData = {};
            };

            vm.listenTo("selectedNode", (ev, node) => {
                window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction({
                    fnString: `selectComponentById(${node.id})`
                });

                // teardown old polling
                stopRefreshingViewModelData();

                // when a new node is selected, remove old viewmodel data
                resetViewModelData();

                stopRefreshingViewModelData = window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction({
                    fn: () => {
                        return "getViewModelData(__CANJS_DEVTOOLS__.$0, { expandedKeys: [ '" +
                                    this.expandedKeys.serialize().join("', '") +
                                "' ] } )";
                    },
                    refreshInterval: 100,
                    success: function(result) {
                        var status = result.status;
                        var detail = result.detail;

                        switch(status) {
                            case "ignore":
                                break;
                            case "error":
                                vm.error = detail;
                                break;
                            case "success":
                                Reflect.updateDeep(vm.viewModelData, detail.viewModel);
                                Reflect.updateDeep(vm.typeNamesData, detail.namesByPath);
                                break;
                        }
                    }
                });
            });

            var stopRefreshingComponentTree = window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction({
                fnString: "getComponentTreeData()",
                refreshInterval: 2000,
                success: function(result) {
                    var status = result.status;
                    var detail = result.detail;

                    switch(status) {
                        case "ignore":
                            break;
                        case "error":
                            vm.error = error;
                            break;
                        case "success":
                            vm.componentTree.updateDeep(detail.tree);
                            break;
                    };
                }
            });

            return function disconnect() {
                stopRefreshingComponentTree();
                stopRefreshingViewModelData();
            };
        },

        // Component Tree data
        componentTree: DefineList,
        selectedNode: DefineMap,

        // ViewModel Editor data
        error: "string",
        viewModelData: DefineMap,
        typeNamesData: DefineMap,
        expandedKeys: DefineList,

        updateValues: function(data) {
            window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction({
                fnString: "updateViewModel(__CANJS_DEVTOOLS__.$0, " + JSON.stringify(data) + ")"
            });
        },
    }
});
