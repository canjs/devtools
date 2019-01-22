import { Component, DefineMap, DefineList, Reflect } from "../node_modules/can-devtools-components/dist/viewmodel-editor.mjs";

import helpers from "../canjs-devtools-helpers.mjs";

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
                messages:from="messages"
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
        messages: DefineMap,
        expandedKeys: DefineList,

        updateValues: function(data) {
            helpers.runDevtoolsFunction({
                fnString: "updateViewModel($0, " + JSON.stringify(data) + ")"
            });
        },

        connectedCallback() {
            var vm = this;

            var stopRefreshing = helpers.runDevtoolsFunction({
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
                                vm.viewModelData = detail.viewModelData;
                                vm.typeNamesData = detail.typeNames;
                                vm.messages = detail.messages;
                            } else {
                                if (vm.viewModelData) {
                                    if (detail.viewModelData) {
                                        Reflect.updateDeep(vm.viewModelData, detail.viewModelData);
                                        vm.typeNamesData = detail.typeNames;
                                        vm.messages = detail.messages;
                                    } else {
                                        Reflect.deleteKeyValue(vm, "viewModelData");
                                        Reflect.deleteKeyValue(vm, "typeNamesData");
                                        Reflect.deleteKeyValue(vm, "messages");
                                    }
                                } else {
                                    Reflect.setKeyValue(vm, "viewModelData", detail.viewModelData);
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
