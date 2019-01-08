import { Component, DefineMap, DefineList, Reflect } from "../node_modules/can-devtools-components/dist/viewmodel-editor.mjs";

Component.extend({
    tag: "canjs-devtools-viewmodel-editor",

    view: `
        {{#if error}}
            <h2>{{{error}}}</h2>
        {{else}}
            <viewmodel-editor
                tagName:from="tagName"
                viewModelData:from="viewModelData"
                typeNamesData:from="typeNamesData"
                updateValues:from="updateValues"
                expandedKeys:to="expandedKeys"
            ></viewmodel-editor>
        {{/if}}
    `,

    ViewModel: {
        tagName: "string",
        error: "string",
        viewModelData: DefineMap,
        typeNamesData: DefineMap,
        expandedKeys: DefineList,

        updateValues: function(data) {
            window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction({
                fnString: "updateViewModel($0, " + JSON.stringify(data) + ")"
            });
        },

        connectedCallback() {
            var vm = this;

            var stopRefreshing = window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction({
                fn: () => {
                    return "getViewModelData($0, { expandedKeys: [ '" +
                                (vm.expandedKeys ? vm.expandedKeys.serialize().join("', '") : "")+
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
                            // if selected element changed, remove viewModel completely
                            if (vm.tagName !== detail.tagName) {
                                vm.error = null;
                                vm.tagName = detail.tagName;
                                vm.viewModelData = detail.viewModel;
                                vm.typeNamesData = detail.namesByPath;
                            } else {
                                if (vm.viewModelData) {
                                    if (detail.viewModel) {
                                        Reflect.updateDeep(vm.viewModelData, detail.viewModel);
                                        vm.typeNamesData = detail.namesByPath;
                                    } else {
                                        Reflect.deleteKeyValue(vm, "viewModelData");
                                        Reflect.deleteKeyValue(vm, "typeNamesData");
                                    }
                                } else {
                                    Reflect.setKeyValue(vm, "viewModelData", detail.viewModel);
                                }
                            }
                            break;
                    }
                }
            });

            return function disconnect() {
                stopRefreshing();
            };
        }
    }
});
