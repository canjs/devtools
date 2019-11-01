import {
	ObservableArray,
	ObservableObject,
	Reflect,
	StacheElement,
	type
} from "../node_modules/can-devtools-components/dist/panel.mjs";

import helpers from "../canjs-devtools-helpers.mjs";

export default class CanjsDevtoolsPanel extends StacheElement {
	static get view() {
		return `
			{{# if(this.panelError) }}
				<h2>{{{ this.panelError }}}</h2>
			{{ else }}
				<components-panel
					componentTree:to="this.componentTree"
					selectedNode:to="this.selectedNode"
					viewModelData:bind="this.viewModelData"
					typeNamesData:bind="this.typeNamesData"
					messages:bind="this.messages"
					undefineds:bind="this.undefineds"
					viewModelEditorError:bind="this.viewModelEditorError"
					updateValues:from="this.updateValues"
					expandedKeys:to="this.expandedKeys"
					breakpoints:bind="this.breakpoints"
					breakpointsError:bind="this.breakpointsError"
					addBreakpoint:from="this.addBreakpoint"
					toggleBreakpoint:from="this.toggleBreakpoint"
					deleteBreakpoint:from="this.deleteBreakpoint"
				></components-panel>
			{{/ if }}
		`;
	}

	static get props() {
		return {
			// general component data
			panelError: {
				value({ listenTo, lastSet, resolve }) {
					listenTo(lastSet, resolve);
					// when a new node is selected, reset the error
					listenTo("selectedNode", () => {
						resolve(undefined);
					});
				}
			},

			// Component Tree data
			componentTree: type.convert(ObservableArray),

			selectedNode: type.convert(ObservableObject),

			// ViewModel Editor data
			viewModelData: {
				type: type.convert(ObservableObject),
				value({ listenTo, lastSet, resolve }) {
					listenTo(lastSet, resolve);
					// when a new node is selected, reset the data
					listenTo("selectedNode", () => {
						resolve(new ObservableObject());
					});
				}
			},

			typeNamesData: {
				type: type.convert(ObservableObject),
				value({ listenTo, lastSet, resolve }) {
					listenTo(lastSet, resolve);
					// when a new node is selected, reset the data
					listenTo("selectedNode", () => {
						resolve(new ObservableObject());
					});
				}
			},

			messages: {
				type: type.convert(ObservableObject),
				value({ listenTo, lastSet, resolve }) {
					listenTo(lastSet, resolve);
					// when a new node is selected, reset the data
					listenTo("selectedNode", () => {
						resolve(new ObservableObject());
					});
				}
			},

			undefineds: {
				type: type.convert(ObservableArray),
				value({ listenTo, lastSet, resolve }) {
					listenTo(lastSet, resolve);
					// when a new node is selected, reset the data
					listenTo("selectedNode", () => {
						resolve(new ObservableArray());
					});
				}
			},

			expandedKeys: type.convert(ObservableArray),
			viewModelEditorError: String,

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

			breakpoints: type.convert(ObservableArray)
		};
	}

	// ViewModel Editor functions
	updateValues(data) {
		helpers.runDevtoolsFunction({
			fnString:
				"updateViewModel(__CANJS_DEVTOOLS__.$0, " + JSON.stringify(data) + ")"
		});
	}

	// Breakpoints Panel functions
	addBreakpoint(expression) {
		const vm = this;

		helpers.runDevtoolsFunction({
			// indentation below is weird on purpose
			// this is so it looks normal when a debugger is hit
			fnString: `addBreakpoint(${helpers.getBreakpointEvalString({
				expression
			})})`,
			success(result) {
				const status = result.status;
				const detail = result.detail;

				switch (status) {
					case "error":
						vm.breakpointsError = detail;
						break;
					case "success":
						vm.breakpoints = detail.breakpoints;
						break;
				}
			}
		});
	}

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
	}

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

	connected() {
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
					return `getViewModelData(__CANJS_DEVTOOLS__.$0, { expandedKeys: [ '${this.expandedKeys
						.serialize()
						.join("', '")}' ] } )`;
				},
				refreshInterval: 100,
				success(result) {
					const status = result.status;
					const detail = result.detail;

					switch (status) {
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

				switch (status) {
					case "ignore":
						break;
					case "error":
						vm.breakpointsError = detail;
						break;
					case "success": {
						vm.componentTree.updateDeep(detail.tree || []);

						// restore breakpoints stored in background script (via helpers).
						// this is done after tree data is loaded so that observation can
						// be created on component's viewmodel for each breakpoint.
						const storedBreakpoints = helpers.storedBreakpoints || [];

						storedBreakpoints.forEach((bp, index) => {
							if (!bp.restored) {
								let { expression, path, observationExpression, enabled } = bp;

								const node = path.split(".").reduce((parent, key) => {
									return parent && parent[key];
								}, detail.tree);

								// if node does not exist in tree, do not set up breakpoint
								if (node && node.id) {
									helpers.runDevtoolsFunction({
										// indentation below is weird on purpose
										// this is so it looks normal when a debugger is hit
										fnString: `addBreakpoint(${helpers.getBreakpointEvalString({
											expression,
											selectedComponentStatement: `window.__CANJS_DEVTOOLS__.getComponentById(${node.id})`,
											observationExpression,
											displayExpression: expression,
											pathStatement: `"${path}"`,
											enabled
										})})`,
										success(result) {
											const status = result.status;
											const detail = result.detail;

											switch (status) {
												case "error":
													vm.breakpointsError = detail;
													break;
												case "success":
													vm.breakpoints = detail.breakpoints;

													// mark breakpoint once it has been restored so it will not be restored again
													helpers.storedBreakpoints[index].restored = true;
													break;
											}
										}
									});
								}
							}
						});
						break;
					}
				}
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
	}
}

customElements.define("canjs-devtools-panel", CanjsDevtoolsPanel);
