// this script runs in the page and has access to the user's DOM and JavaScript
// it will only run if there is a `can` global available
(function() {
    var selectedElementClassName = "__canjs-devtools-selected-element__";

    var getViewModelData = function() {
        var selectedElement = document.querySelector("." + selectedElementClassName);

        return {
            tagName: selectedElement.tagName,
            viewModel: can.viewModel(selectedElement).serialize()
        };
    };

    var sendResponse = function(action, data) {
        var response = new CustomEvent("canjs-devtools-response", {
            detail: {
                action: action,
                data: data
            }
        });

        document.dispatchEvent(response);
    };

    document.addEventListener("canjs-devtools-request", function(request) {
        var action = request.detail && request.detail.action;

        switch(action) {
            case "viewModel":
                var data = getViewModelData();
                sendResponse("viewModel", data);
                break;

            case "default":
                break;
        }
    });
}());
