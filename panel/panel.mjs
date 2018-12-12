import { Component, DefineList } from "../node_modules/can-devtools-components/dist/panel.mjs";

Component.extend({
    tag: "canjs-devtools-panel",

    view: `
        {{# if(error) }}
            <h2>{{{error}}}</h2>
        {{ else }}
            <components-panel
                componentTree:bind="componentTree"
            ></components-panel>
        {{/ if }}
    `,

    ViewModel: {
        connectedCallback() {
            var vm = this;

            var stopRefreshing = window.CANJS_DEVTOOLS_HELPERS.runDevtoolsFunction({
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
                stopRefreshing();
            };
        },

        componentTree: DefineList,
        error: "string"
    }
});
