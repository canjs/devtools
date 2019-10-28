import {
	ObservableArray,
	ObservableObject,
	Reflect,
	StacheElement,
	type
} from "../node_modules/can-devtools-components/dist/viewmodel-editor.mjs";

import helpers from "../canjs-devtools-helpers.mjs";

class CanjsDevtoolsViewmodelEditor extends StacheElement {
	static get view() {
		return `
			{{# if(this.editorError) }}
				<h2>{{{ this.editorError }}}</h2>
			{{ else }}
				<viewmodel-editor
					tagName:from="this.tagName"
					viewModelData:from="this.viewModelData"
					typeNamesData:from="this.typeNamesData"
					messages:from="this.messages"
					undefineds:from="this.undefineds"
					updateValues:from="this.updateValues"
					expandedKeys:to="this.expandedKeys"
				></viewmodel-editor>
			{{/ if }}
		`;
	}

	static get props() {
		return {
			tagName: { type: String, default: "" },
			editorError: String,
			viewModelData: type.convert(ObservableObject),
			typeNamesData: type.convert(ObservableObject),
			messages: type.convert(ObservableObject),
			undefineds: type.convert(ObservableArray),
			expandedKeys: type.convert(ObservableArray)
		};
	}

	connected() {
		var vm = this;

		var stopRefreshing = helpers.runDevtoolsFunction({
			fn: () => {
				return (
					"getViewModelData($0, { expandedKeys: [ '" +
					(vm.expandedKeys ? vm.expandedKeys.serialize().join("', '") : "") +
					"' ] } )"
				);
			},
			refreshInterval: 100,
			success: function(result) {
				var status = result.status;
				var detail = result.detail;

				switch (status) {
					case "ignore":
						break;
					case "error":
						vm.editorError = detail;
						break;
					case "success":
						// if selected element changed, remove viewModel completely
						if (vm.tagName !== detail.tagName) {
							vm.editorError = null;
							vm.tagName = detail.tagName;
							vm.viewModelData = detail.viewModelData || {};
							vm.typeNamesData = detail.typeNames || {};
							vm.messages = detail.messages || {};
							vm.undefineds = detail.undefineds || [];
						} else {
							if (vm.viewModelData) {
								if (detail.viewModelData) {
									Reflect.updateDeep(
										vm.viewModelData,
										detail.viewModelData || {}
									);
									vm.typeNamesData = detail.typeNames;
									vm.messages = detail.messages;
									vm.undefineds = detail.undefineds;
								} else {
									Reflect.deleteKeyValue(vm, "viewModelData");
									Reflect.deleteKeyValue(vm, "typeNamesData");
									Reflect.deleteKeyValue(vm, "messages");
									Reflect.deleteKeyValue(vm, "undefineds");
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

	updateValues(data) {
		helpers.runDevtoolsFunction({
			fnString: "updateViewModel($0, " + JSON.stringify(data) + ")"
		});
	}
}

customElements.define(
	"canjs-devtools-viewmodel-editor",
	CanjsDevtoolsViewmodelEditor
);
