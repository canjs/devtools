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
        <viewmodel-editor
			tagName:from="tagName"
			viewModelData:from="viewModelData"
			setKeyValue:from="setKeyValue"
        ></viewmodel-editor>
    `,

    ViewModel: {
        tagName: "string",

        viewModelData: "observable",

        setKeyValue: function(key, value) {
            for (var i=0; i<registeredFrameURLs.length; i++) {
                chrome.devtools.inspectedWindow.eval(
                    "__CANJS_DEVTOOLS__.setViewModelKeyValue($0, '" + key + "', '" + value + "')",
                    { frameURL: registeredFrameURLs[i] },
                    function(result, isException) {
                        if (isException) {
                            console.error(isException);
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
                                console.error(isException);
                            }

                            if (!result) {
                                return;
                            }

                            // if selected element changed, remove viewModel completely
                            if (vm.tagName !== result.tagName) {
                                vm.tagName = result.tagName;
                                vm.viewModelData = result.viewModel;
                            } else {
                                if (vm.viewModelData) {
                                    if (result.viewModel) {
                                        can.Reflect.update(vm.viewModelData, result.viewModel);
                                    } else {
                                        can.Reflect.deleteKeyValue(vm, "viewModelData");
                                    }
                                } else {
                                    can.Reflect.setKeyValue(vm, "viewModelData", result.viewModel);
                                }
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
