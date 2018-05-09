// URLs of all frames that have registered that they
// have a global `can` present
var registeredFrameURLs = [];

// listen to messages from the injected-script
chrome.runtime.onMessage.addListener(function(msg, sender) {
    if (msg.type === "update-frames") {
        registeredFrameURLs = msg.frameURLs;
    }
});

can.Component.extend({
    tag: "canjs-devtools-viewmodel-editor",

    view: `
        {{#if error}}
            <h2>{{error}}</h2>
        {{else}}
            <viewmodel-editor
                tagName:from="tagName"
                viewModelData:from="viewModelData"
                setKeyValue:from="setKeyValue"
            ></viewmodel-editor>
        {{/if}}
    `,

    ViewModel: {
        tagName: "string",

        viewModelData: "observable",

        error: "string",

        setKeyValue: function(key, value) {
            for (var i=0; i<registeredFrameURLs.length; i++) {
                chrome.devtools.inspectedWindow.eval(
                    "__CANJS_DEVTOOLS__.setViewModelKeyValue($0, '" + key + "', '" + value + "')",
                    { frameURL: registeredFrameURLs[i] },
                    function(result, isException) {
                        if (isException) {
                            return;
                        }
                    }
                );
            }
        },

        connectedCallback() {
            var vm = this;
            var timeoutId;

            (function getSelectedElementData() {
                for (var i=0; i<registeredFrameURLs.length; i++) {
                    chrome.devtools.inspectedWindow.eval(
                        "__CANJS_DEVTOOLS__.getViewModelData($0)",
                        { frameURL: registeredFrameURLs[i] },
                        function(result, isException) {
                            if (isException) {
                                return;
                            }

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
                                                can.Reflect.update(vm.viewModelData, detail.viewModel);
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
                }

                timeoutId = setTimeout(getSelectedElementData, 100);
            }());

            return function disconnect() {
                clearTimeout(timeoutId);
            };
        }
    }
});
