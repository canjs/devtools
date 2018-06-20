can.Component.extend({
    tag: "canjs-devtools-viewmodel-editor",

    view: `
        {{#if error}}
            <h2>{{{error}}}</h2>
        {{else}}
            <viewmodel-editor
                tagName:from="tagName"
                viewModelData:from="viewModelData"
                updateValues:from="updateValues"
            ></viewmodel-editor>
        {{/if}}
    `,

    ViewModel: {
        tagName: "string",

        viewModelData: "observable",

        error: "string",

        updateValues: function(data) {
            window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction(
                "updateViewModel($0, " + JSON.stringify(data) + ")"
            );
        },

        connectedCallback() {
            var vm = this;
            var timeoutId;

            (function getSelectedElementData() {
                window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction(
                    "getViewModelData($0)",
                    function(result) {
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
                                } else {
                                    if (vm.viewModelData) {
                                        if (detail.viewModel) {
                                            can.Reflect.updateDeep(vm.viewModelData, detail.viewModel);
                                        } else {
                                            can.Reflect.deleteKeyValue(vm, "viewModelData");
                                        }
                                    } else {
                                        can.Reflect.setKeyValue(vm, "viewModelData", detail.viewModel);
                                    }
                                }
                                break;
                        }
                    }
                );

                timeoutId = setTimeout(getSelectedElementData, 100);
            }());

            return function disconnect() {
                clearTimeout(timeoutId);
            };
        }
    }
});
