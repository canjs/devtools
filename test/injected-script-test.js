import { assert } from "chai/chai";
import DefineList from "can-define/list/list";
import "steal-mocha";

import {
	debug,
	DeepObservable,
	ObservableArray,
	ObservableObject,
	Observation,
	Reflect,
	StacheElement,
	type
} from "can";
import "../canjs-devtools-injected-script";

const isElement = el => el.toString() === "[object HTMLElement]";

describe("canjs-devtools-injected-script", () => {
	let devtools, windowCan;

	before(() => {
		// register devtools
		debug();

		// make sure devtools is not using global `can`
		windowCan = window.can;
		delete window.can;

		// get access to devtools functions
		devtools = window.__CANJS_DEVTOOLS__;
	});

	after(() => {
		window.can = windowCan;
	});

	describe("getViewModelData", () => {
		it("basics", () => {
			class App extends StacheElement {
				static get view() {
					return "<p>{{ this.name }}</p>";
				}
				static get props() {
					return {
						first: "Kevin",
						last: "McCallister",
						get name() {
							return this.first + " " + this.last;
						}
					};
				}
			}
			customElements.define("a-pp-4", App);

			const el = new App().render();

			const {
				viewModelData: viewModelDataFromEl,
				tagName: tagNameFromEl,
				typeNames: typeNamesFromEl
			} = devtools.getViewModelData(el).detail;

			assert.equal(tagNameFromEl, "<a-pp-4>", "tagName from el");
			assert.deepEqual(
				viewModelDataFromEl,
				{ first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
				"viewModelData from el"
			);
			assert.deepEqual(typeNamesFromEl, {}, "typeNames from el");

			const {
				viewModelData: viewModelDataFromChild,
				tagName: tagNameFromChild,
				typeNames: typeNamesFromChild
			} = devtools.getViewModelData(el.querySelector("p")).detail;

			assert.equal(tagNameFromChild, "<a-pp-4>", "tagName from child of el");
			assert.deepEqual(
				viewModelDataFromChild,
				{ first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
				"viewModelData from child of el"
			);
			assert.deepEqual(typeNamesFromChild, {}, "typeNames from child of el");
		});

		it("can handle elements", () => {
			class AppWithElement extends StacheElement {
				static get view() {
					return "<p>this app has an element on its viewModelData</p>";
				}

				static get props() {
					return {
						element: {
							get default() {
								return document.createElement("p");
							}
						}
					};
				}
			}

			customElements.define("app-with-element", AppWithElement);

			const el = new AppWithElement();
			const { viewModelData, typeNames, messages } = devtools.getViewModelData(
				el
			).detail;

			assert.deepEqual(
				viewModelData,
				{ element: {} },
				"gets correct viewModelData data"
			);

			assert.deepEqual(
				typeNames,
				{ element: "HTMLParagraphElement{}" },
				"gets correct name data"
			);

			assert.deepEqual(
				messages,
				{
					element: {
						type: "info",
						message: "CanJS Devtools does not expand HTML Elements"
					}
				},
				"gets correct message data"
			);
		});

		it("can handle lists of elements", () => {
			class AppWithListOfElements extends StacheElement {
				static get view() {
					return "<p>this app has a list of elements on its viewModel</p>";
				}

				static get props() {
					return {
						elements: {
							get default() {
								return new ObservableArray([
									document.createElement("p"),
									document.createElement("p")
								]);
							}
						}
					};
				}
			}

			customElements.define("app-with-list-of-elements", AppWithListOfElements);

			const el = new AppWithListOfElements().render();
			const { viewModelData, typeNames, messages } = devtools.getViewModelData(
				el
			).detail;

			assert.deepEqual(
				viewModelData,
				{ elements: {} },
				"gets correct viewModelData data - unexpanded"
			);

			assert.deepEqual(
				typeNames,
				{ elements: "TypeConstructor[]" },
				"gets correct name data - unexpanded"
			);

			assert.deepEqual(messages, {}, "gets correct message data - unexpanded");

			const {
				viewModelData: viewModelDataListExpanded,
				typeNames: typeNamesListExpanded,
				messages: messagesListExpanded
			} = devtools.getViewModelData(el, { expandedKeys: ["elements"] }).detail;

			assert.deepEqual(
				viewModelDataListExpanded,
				{ elements: { 0: {}, 1: {} } },
				"gets correct viewModelData data - list expanded"
			);

			assert.deepEqual(
				typeNamesListExpanded,
				{
					elements: "TypeConstructor[]",
					"elements.0": "HTMLParagraphElement{}",
					"elements.1": "HTMLParagraphElement{}"
				},
				"gets correct name data - list expanded"
			);

			assert.deepEqual(
				messagesListExpanded,
				{
					"elements.0": {
						type: "info",
						message: "CanJS Devtools does not expand HTML Elements"
					},
					"elements.1": {
						type: "info",
						message: "CanJS Devtools does not expand HTML Elements"
					}
				},
				"gets correct message data - list expanded"
			);
		});

		it("can handle functions", () => {
			class AppWithFunctions extends StacheElement {
				static get view() {
					return "<p>this app uses functions</p>";
				}

				static get props() {
					return {
						Thing: {
							get default() {
								return function Thing() {};
							}
						}
					};
				}
			}

			customElements.define("app-with-functions", AppWithFunctions);

			const el = new AppWithFunctions();
			const { viewModelData, typeNames, messages } = devtools.getViewModelData(
				el
			).detail;

			assert.deepEqual(
				viewModelData,
				{ Thing: {} },
				"shows an empty object for function so it can be expanded to show function source"
			);

			assert.deepEqual(
				typeNames,
				{ Thing: "function" },
				"shows correct name for function"
			);

			assert.deepEqual(
				messages,
				{ Thing: { type: "info", message: "function Thing() {}" } },
				"shows function source info message"
			);
		});

		it("can handle circular references (#46)", () => {
			const circular = {};
			circular.circular = circular;

			class CircularApp extends StacheElement {
				static get view() {
					return "<p>hello</p>";
				}

				static get props() {
					return {
						circular: {
							type: DeepObservable,
							get default() {
								return circular;
							}
						}
					};
				}
			}

			customElements.define("circular-app-2", CircularApp);

			const el = new CircularApp().initialize();
			const { viewModelData, typeNames, messages } = devtools.getViewModelData(
				el
			).detail;

			assert.deepEqual(
				viewModelData,
				{ circular: {} },
				"gets empty object for circular property"
			);

			assert.deepEqual(
				typeNames,
				{ circular: "Object{}" },
				"gets correct name for circular property"
			);

			assert.equal(typeof messages, "object");
			assert.equal(typeof messages.circular, "object");
			assert.equal(messages.circular.type, "error");
			assert.ok(
				messages.circular.message.match(/Error getting value of "circular":/)
			);
		});

		it("can handle infinite recursion (#46)", () => {
			class Thing extends ObservableObject {
				static get props() {
					return {
						anotherThing: {
							default() {
								return new Thing();
							}
						}
					};
				}
			}

			class C extends StacheElement {
				static get view() {
					return "<p>hello</p>";
				}

				static get props() {
					return {
						thing: {
							get default() {
								return new Thing();
							}
						}
					};
				}
			}

			customElements.define("circular-app", C);

			const el = new C().initialize();
			const { viewModelData, typeNames } = devtools.getViewModelData(el).detail;

			assert.deepEqual(
				viewModelData,
				{ thing: {} },
				"gets empty object for recursive property"
			);

			assert.deepEqual(typeNames, { thing: "Thing{}" }, "gets correct name");
		});

		it("can handle nulls and undefineds", () => {
			class C extends StacheElement {
				static get view() {
					return "<p>hello</p>";
				}

				static get props() {
					return {
						thisIsNull: { default: null, type: type.maybe(String) },
						thisIsUndefined: { default: undefined, type: type.maybe(String) }
					};
				}
			}

			customElements.define("app-with-nulls", C);

			const el = new C().initialize();

			const { viewModelData, messages, undefineds } = devtools.getViewModelData(
				el
			).detail;

			assert.deepEqual(
				viewModelData,
				{ thisIsNull: null, thisIsUndefined: undefined },
				"gets null for property that is null and undefined for property that is undefined"
			);

			assert.deepEqual(
				undefineds,
				["thisIsUndefined"],
				"gets undefineds array with paths whose value is `undefined`"
			);

			assert.deepEqual(messages, {}, "gets no messages");
		});

		it("can handle empty Maps / Lists / Objects / arrays", () => {
			class C extends StacheElement {
				static get view() {
					return "<p>hello</p>";
				}

				static get props() {
					return {
						emptyMap: {
							get default() {
								return new ObservableObject();
							}
						},
						emptyList: {
							get default() {
								return new ObservableArray();
							}
						},
						emptyObject: {
							get default() {
								return {};
							}
						},
						emptyArray: {
							get default() {
								return [];
							}
						}
					};
				}
			}

			customElements.define("app-with-empties", C);

			const el = new C().render();

			const { viewModelData, typeNames, messages } = devtools.getViewModelData(
				el,
				{ expandedKeys: ["emptyMap", "emptyList", "emptyObject", "emptyArray"] }
			).detail;

			assert.deepEqual(
				viewModelData,
				{
					emptyMap: {},
					emptyList: {},
					emptyObject: {},
					emptyArray: {}
				},
				"viewModelData properties are correct"
			);

			assert.deepEqual(
				typeNames,
				{
					emptyMap: "TypeConstructor{}",
					emptyList: "TypeConstructor[]",
					emptyObject: "Object{}",
					emptyArray: "Array[]"
				},
				"typeNames are correct"
			);

			assert.deepEqual(
				messages,
				{
					emptyMap: { type: "info", message: "Map is empty" },
					emptyList: { type: "info", message: "List is empty" },
					emptyObject: { type: "info", message: "Object is empty" },
					emptyArray: { type: "info", message: "Array is empty" }
				},
				"gets correct messages"
			);
		});
	});

	it("getNearestElementWithViewModel", () => {
		class C extends StacheElement {
			static get view() {
				return "<p>{{ this.name }}</p>";
			}

			static get props() {
				return {};
			}
		}

		customElements.define("a-pp", C);

		const el = new C().render();

		assert.deepEqual(
			devtools.getNearestElementWithViewModel(el),
			el,
			"gets element from element with a viewmodel"
		);

		assert.deepEqual(
			devtools.getNearestElementWithViewModel(el.querySelector("p")),
			el,
			"gets element from child of element with a viewmodel"
		);
	});

	describe("getSerializedViewModelData", () => {
		it("viewModelData", () => {
			class VM extends ObservableObject {
				static get props() {
					return {
						name: String
					};
				}
			}

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM()).viewModelData,
				{ name: undefined },
				"works for basic ViewModel"
			);

			class VM2 extends ObservableObject {
				static get props() {
					return {
						first: { type: String, default: "Kevin" },
						last: { type: String, default: "McCallister" },
						get name() {
							return this.first + " " + this.last;
						}
					};
				}
			}

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM2()).viewModelData,
				{ first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
				"works for ViewModel with serialized properties"
			);

			class VM3 extends ObservableObject {
				static get props() {
					return {
						hobbies: {
							get default() {
								return [{ name: "singing" }, { name: "dancing" }];
							}
						}
					};
				}
			}

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM3()).viewModelData,
				{ hobbies: {} },
				"works for ObservableObject with nested array - unexpanded"
			);

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM3(), {
					expandedKeys: ["hobbies"]
				}).viewModelData,
				{ hobbies: { 0: {}, 1: {} } },
				"works for ObservableObject with nested array - array expanded"
			);

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM3(), {
					expandedKeys: ["hobbies", "hobbies.0", "hobbies.1"]
				}).viewModelData,
				{ hobbies: { 0: { name: "singing" }, 1: { name: "dancing" } } },
				"works for ObservableObject with nested array - all expanded"
			);

			class Hobby extends ObservableObject {
				static get props() {
					return {
						name: String
					};
				}
			}

			class Hobbies extends ObservableArray {
				static get items() {
					return type.convert(Hobby);
				}
			}

			class VM4 extends ObservableObject {
				static get props() {
					return {
						hobbies: {
							get default() {
								return new Hobbies([{ name: "singing" }, { name: "dancing" }]);
							}
						}
					};
				}
			}

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM4()).viewModelData,
				{ hobbies: {} },
				"works for nested ObservableObjects - unexpanded"
			);

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM4(), {
					expandedKeys: ["hobbies"]
				}).viewModelData,
				{ hobbies: { 0: {}, 1: {} } },
				"works for nested ObservableObjects - array expanded"
			);

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM4(), {
					expandedKeys: ["hobbies", "hobbies.0", "hobbies.1"]
				}).viewModelData,
				{ hobbies: { 0: { name: "singing" }, 1: { name: "dancing" } } },
				"works for nested ObservableObjects - everything expanded"
			);

			class PersonName extends ObservableObject {
				static get props() {
					return {
						first: { type: String, default: "kevin" },
						last: { type: String, default: "phillips" }
					};
				}
			}

			class VM5 extends ObservableObject {
				static get props() {
					return {
						name: {
							get default() {
								return new PersonName();
							}
						},
						age: { default: 32 }
					};
				}
			}

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM5()).viewModelData,
				{ age: 32, name: {} },
				"only serializes top-level properties by default"
			);
		});

		it("typeNames", () => {
			class AThing extends ObservableObject {}

			class VM extends ObservableObject {
				static get props() {
					return {
						aThing: {
							get default() {
								return new AThing();
							}
						}
					};
				}
			}

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM()).typeNames,
				{ aThing: "AThing{}" },
				"AThing{} - nothing expanded"
			);

			class ListOfThings extends ObservableArray {
				static get items() {
					return type.convert(AThing);
				}
			}

			class VM2 extends ObservableObject {
				static get props() {
					return {
						things: {
							get default() {
								return new ListOfThings([{}]);
							}
						}
					};
				}
			}

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM2()).typeNames,
				{ things: "ListOfThings[]" },
				"ListOfThings[] - nothing expanded"
			);

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM2(), {
					expandedKeys: ["things"]
				}).typeNames,
				{ things: "ListOfThings[]", "things.0": "AThing{}" },
				"ListOfThings[] - list expanded"
			);

			class Name extends ObservableObject {}
			class NamedThing extends ObservableObject {
				static get props() {
					return {
						name: type.convert(Name)
					};
				}
			}
			class ListOfNamedThings extends ObservableArray {
				static get items() {
					return type.convert(NamedThing);
				}
			}

			class VM3 extends ObservableObject {
				static get props() {
					return {
						things: {
							get default() {
								return new ListOfNamedThings([{ name: {} }]);
							}
						}
					};
				}
			}

			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM3()).typeNames,
				{ things: "ListOfNamedThings[]" },
				"ListOfNamedThings[] - nothing expanded"
			);
			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM3(), {
					expandedKeys: ["things"]
				}).typeNames,
				{ things: "ListOfNamedThings[]", "things.0": "NamedThing{}" },
				"ListOfNamedThings[] - list expanded"
			);
			assert.deepEqual(
				devtools.getSerializedViewModelData(new VM3(), {
					expandedKeys: ["things", "things.0"]
				}).typeNames,
				{
					things: "ListOfNamedThings[]",
					"things.0": "NamedThing{}",
					"things.0.name": "Name{}"
				},
				"ListOfNamedThings[] - everything expanded"
			);
		});

		it("undefineds", () => {
			class ViewModel extends ObservableObject {
				static get props() {
					return {
						thisIsUndefined: { default: undefined, type: type.convert(String) },
						obj: {
							get default() {
								return new ObservableObject({
									thisIsUndefined: undefined
								});
							}
						}
					};
				}
			}

			assert.deepEqual(
				devtools.getSerializedViewModelData(new ViewModel()).undefineds,
				["thisIsUndefined"],
				"nothing expanded"
			);

			assert.deepEqual(
				devtools.getSerializedViewModelData(new ViewModel(), {
					expandedKeys: ["obj"]
				}).undefineds,
				["thisIsUndefined", "obj.thisIsUndefined"],
				"obj expanded"
			);
		});
	});

	it("updateViewModel", () => {
		class C extends StacheElement {
			static get view() {
				return "<p>{{ this.name }}</p>";
			}

			static get props() {
				return {
					first: { type: type.maybeConvert(String), default: "Kevin" },
					last: { type: type.maybeConvert(String), default: "McCallister" },
					get name() {
						return this.first + " " + this.last;
					},
					hobbies: {
						get default() {
							return ["running", "jumping"];
						}
					}
				};
			}
		}

		customElements.define("a-pp-2", C);

		const el = new C().render();

		assert.deepEqual(
			devtools.getSerializedViewModelData(el, {
				expandedKeys: ["hobbies"]
			}).viewModelData,
			{
				first: "Kevin",
				last: "McCallister",
				name: "Kevin McCallister",
				hobbies: { 0: "running", 1: "jumping" }
			},
			"default viewmodel data"
		);

		devtools.updateViewModel(el, [
			{ type: "set", key: "first", value: "Marty" },
			{ type: "set", key: "last", value: "McFly" }
		]);

		assert.deepEqual(
			devtools.getSerializedViewModelData(el, {
				expandedKeys: ["hobbies"]
			}).viewModelData,
			{
				first: "Marty",
				last: "McFly",
				name: "Marty McFly",
				hobbies: { 0: "running", 1: "jumping" }
			},
			"set works"
		);

		devtools.updateViewModel(el, [{ type: "delete", key: "last" }]);

		assert.deepEqual(
			devtools.getSerializedViewModelData(el, {
				expandedKeys: ["hobbies"]
			}).viewModelData,
			{
				first: "Marty",
				last: undefined,
				name: "Marty undefined",
				hobbies: { 0: "running", 1: "jumping" }
			},
			"delete works"
		);

		devtools.updateViewModel(el, [
			{
				type: "splice",
				key: "hobbies",
				index: 0,
				deleteCount: 1,
				insert: ["skipping"]
			}
		]);

		assert.deepEqual(
			devtools.getSerializedViewModelData(el, {
				expandedKeys: ["hobbies"]
			}).viewModelData,
			{
				first: "Marty",
				last: undefined,
				name: "Marty undefined",
				hobbies: { 0: "skipping", 1: "jumping" }
			},
			"splice works"
		);
	});

	it("getViewModelKeys", () => {
		class C extends StacheElement {
			static get view() {
				return "<p>{{ this.name }}</p>";
			}

			static get props() {
				return {
					first: { type: String, default: "Kevin" },
					last: { type: String, default: "McCallister" },
					get name() {
						return this.first + " " + this.last;
					}
				};
			}
		}

		customElements.define("a-pp-3", C);

		const el = new C().initialize();

		assert.deepEqual(
			devtools.getViewModelKeys(el),
			["first", "last", "name"],
			"gets viewmodel keys"
		);

		const list = new DefineList([{ one: "two" }, { three: "four" }]);
		assert.deepEqual(
			devtools.getViewModelKeys(list),
			["0", "1"],
			"ignore _ keys for ObservableArray"
		);
	});

	describe("component tree", () => {
		let appOne, appTwo, appThree, treeData;
		const fixture = document.getElementById("mocha-fixture");

		// run once before all tests in this describe
		// so that component IDs do not change between tests
		before(() => {
			// <a-pp>
			//   <div>
			//      <a-child>
			//          <a-deep-child/>
			//      </a-child>
			//   </div>
			//   <a-nother-child>
			//      <p>
			//          <a-nother-deep-child/>
			//      </p>
			//   </a-nother-child>
			// </a-pp>
			// <a-pp>
			//   <div>
			//      <a-child>
			//          <a-deep-child/>
			//      </a-child>
			//   </div>
			//   <a-nother-child>
			//      <p>
			//          <a-nother-deep-child/>
			//      </p>
			//   </a-nother-child>
			// </a-pp>
			class AChild extends StacheElement {
				static get view() {
					return "<a-deep-child/>";
				}

				static get props() {
					return {};
				}
			}

			customElements.define("a-child", AChild);

			class ADeepChild extends StacheElement {
				static get view() {
					return "<p>a deep child</p>";
				}

				static get props() {
					return {};
				}
			}

			customElements.define("a-deep-child", ADeepChild);

			class ANotherChild extends StacheElement {
				static get view() {
					return "<p><a-nother-deep-child/></p>";
				}

				static get props() {
					return {};
				}
			}

			customElements.define("a-nother-child", ANotherChild);

			class ANotherDeepChild extends StacheElement {
				static get view() {
					return "<p>another deep child</p>";
				}

				static get props() {
					return {};
				}
			}

			customElements.define("a-nother-deep-child", ANotherDeepChild);

			class App extends StacheElement {
				static get view() {
					return `
						<div>
							<a-child />
						</div>
						<a-nother-child/>
					`;
				}

				static get props() {
					return {};
				}
			}

			customElements.define("a-pp-5", App);

			appOne = new App().render();
			appTwo = new App().render();

			appThree = document.createElement("aa-pp");
			appThree[Symbol.for("can.viewModel")] = appThree;

			fixture.appendChild(appOne);
			fixture.appendChild(appTwo);
			fixture.appendChild(appThree);

			window.$0 = fixture.querySelector("a-nother-deep-child");

			const resp = devtools.getComponentTreeData();
			treeData = resp.detail.tree;
		});

		after(() => {
			fixture.removeChild(appOne);
			fixture.removeChild(appTwo);
			fixture.removeChild(appThree);
		});

		it("getComponentTreeData", () => {
			assert.deepEqual(treeData, [
				{
					path: "0",
					selected: false,
					tagName: "a-pp-5",
					id: 0,
					children: [
						{
							path: "0.children.0",
							selected: false,
							tagName: "a-child",
							id: 1,
							children: [
								{
									path: "0.children.0.children.0",
									selected: false,
									tagName: "a-deep-child",
									id: 2,
									children: []
								}
							]
						},
						{
							path: "0.children.1",
							selected: false,
							tagName: "a-nother-child",
							id: 3,
							children: [
								{
									path: "0.children.1.children.0",
									selected: true,
									tagName: "a-nother-deep-child",
									id: 4,
									children: []
								}
							]
						}
					]
				},
				{
					path: "1",
					selected: false,
					tagName: "a-pp-5",
					id: 5,
					children: [
						{
							path: "1.children.0",
							selected: false,
							tagName: "a-child",
							id: 6,
							children: [
								{
									path: "1.children.0.children.0",
									selected: false,
									tagName: "a-deep-child",
									id: 7,
									children: []
								}
							]
						},
						{
							path: "1.children.1",
							selected: false,
							tagName: "a-nother-child",
							id: 8,
							children: [
								{
									path: "1.children.1.children.0",
									selected: false,
									tagName: "a-nother-deep-child",
									id: 9,
									children: []
								}
							]
						}
					]
				},
				{
					path: "2",
					selected: false,
					tagName: "aa-pp",
					id: 10,
					children: []
				}
			]);
		});

		it("selectComponentById", () => {
			devtools.selectComponentById(0);
			assert.ok(isElement(devtools.$0), "App");
			assert.equal(devtools.$0.tagName.toLowerCase(), "a-pp-5", "a-pp-5");

			devtools.selectComponentById(1);
			assert.ok(isElement(devtools.$0), "Child");
			assert.equal(devtools.$0.tagName.toLowerCase(), "a-child", "a-child");

			devtools.selectComponentById(2);
			assert.ok(isElement(devtools.$0), "DeepChild");
			assert.equal(
				devtools.$0.tagName.toLowerCase(),
				"a-deep-child",
				"a-deep-child"
			);

			devtools.selectComponentById(3);
			assert.ok(isElement(devtools.$0), "AnotherChild");
			assert.equal(
				devtools.$0.tagName.toLowerCase(),
				"a-nother-child",
				"a-nother-child"
			);

			devtools.selectComponentById(4);
			assert.ok(isElement(devtools.$0), "AnotherDeepChild");
			assert.equal(
				devtools.$0.tagName.toLowerCase(),
				"a-nother-deep-child",
				"a-nother-deep-child"
			);

			devtools.selectComponentById(5);
			assert.ok(isElement(devtools.$0), "App");
			assert.equal(
				devtools.$0.tagName.toLowerCase(),
				"a-pp-5",
				"second a-pp-5"
			);

			devtools.selectComponentById(6);
			assert.ok(isElement(devtools.$0), "Child");
			assert.equal(
				devtools.$0.tagName.toLowerCase(),
				"a-child",
				"second a-child"
			);

			devtools.selectComponentById(7);
			assert.ok(isElement(devtools.$0), "DeepChild");
			assert.equal(
				devtools.$0.tagName.toLowerCase(),
				"a-deep-child",
				"second a-deep-child"
			);

			devtools.selectComponentById(8);
			assert.ok(isElement(devtools.$0), "AnotherChild");
			assert.equal(
				devtools.$0.tagName.toLowerCase(),
				"a-nother-child",
				"second a-nother-child"
			);

			devtools.selectComponentById(9);
			assert.ok(isElement(devtools.$0), "AnotherDeepChild");
			assert.equal(
				devtools.$0.tagName.toLowerCase(),
				"a-nother-deep-child",
				"second a-nother-deep-child"
			);

			devtools.selectComponentById(10);
			assert.ok(isElement(devtools.$0), "aa-pp");
			assert.equal(
				devtools.$0.tagName.toLowerCase(),
				"aa-pp",
				"the element is the viewmodel child"
			);
		});
	});

	describe("add / get / toggle / delete breakpoints", () => {
		it("basics", () => {
			let breakpoints = devtools.addBreakpoint({
				expression: "todos.length"
			}).detail.breakpoints;

			assert.equal(breakpoints.length, 1, "addBreakpoint adds a breakpoint");
			assert.equal(
				breakpoints[0].expression,
				"todos.length",
				"first breakpoint has correct expression"
			);
			assert.equal(breakpoints[0].enabled, true, "first breakpoint is enabled");

			const todosLengthBreakpointId = breakpoints[0].id;

			assert.deepEqual(
				devtools.getBreakpoints().detail.breakpoints,
				breakpoints,
				"getBreakpoints works"
			);

			breakpoints = devtools.addBreakpoint({
				expression: "person.nameChanges > 5"
			}).detail.breakpoints;

			assert.equal(
				breakpoints.length,
				2,
				"addBreakpoint adds a second breakpoint"
			);
			assert.equal(
				breakpoints[1].expression,
				"person.nameChanges > 5",
				"second breakpoint has correct expression"
			);
			assert.equal(
				breakpoints[1].enabled,
				true,
				"second breakpoint is enabled"
			);

			const nameChangesBreakpointId = breakpoints[1].id;

			assert.deepEqual(
				devtools.getBreakpoints().detail.breakpoints,
				breakpoints,
				"getBreakpoints still works"
			);

			breakpoints = devtools.toggleBreakpoint(todosLengthBreakpointId).detail
				.breakpoints;
			assert.equal(breakpoints[0].enabled, false, "breakpoint is disabled");
			assert.equal(
				breakpoints[1].enabled,
				true,
				"second breakpoint is enabled"
			);

			breakpoints = devtools.toggleBreakpoint(nameChangesBreakpointId).detail
				.breakpoints;
			assert.equal(breakpoints[0].enabled, false, "breakpoint is disabled");
			assert.equal(
				breakpoints[1].enabled,
				false,
				"second breakpoint is disabled"
			);

			breakpoints = devtools.toggleBreakpoint(nameChangesBreakpointId).detail
				.breakpoints;
			assert.equal(
				breakpoints[0].enabled,
				false,
				"breakpoint is still disabled"
			);
			assert.equal(
				breakpoints[1].enabled,
				true,
				"second breakpoint is re-enabled"
			);

			breakpoints = devtools.toggleBreakpoint(todosLengthBreakpointId).detail
				.breakpoints;
			assert.equal(breakpoints[0].enabled, true, "breakpoint is re-enabled");
			assert.equal(
				breakpoints[1].enabled,
				true,
				"second breakpoint is still enabled"
			);

			breakpoints = devtools.deleteBreakpoint(todosLengthBreakpointId).detail
				.breakpoints;
			assert.equal(breakpoints.length, 1, "first breakpoint is deleted");
			assert.equal(
				breakpoints[0].expression,
				"person.nameChanges > 5",
				"remaining breakpoint has correct expression"
			);
			assert.equal(
				breakpoints[0].enabled,
				true,
				"remaining breakpoint is enabled"
			);

			breakpoints = devtools.deleteBreakpoint(nameChangesBreakpointId).detail
				.breakpoints;
			assert.equal(breakpoints.length, 0, "remaining breakpoint is deleted");
		});

		it("binds and unbinds observation", () => {
			class Todos extends ObservableArray {}
			const todos = new Todos();
			let obs = new Observation(() => todos.length);
			let breakpoints = devtools.addBreakpoint({
				expression: "todos.length",
				observation: obs
			}).detail.breakpoints;

			let breakpointId = breakpoints[0].id;

			assert.ok(Reflect.isBound(obs), "addBreakpoint binds observation");

			devtools.toggleBreakpoint(breakpointId);
			assert.ok(!Reflect.isBound(obs), "toggleBreakpoint unbinds observation");

			devtools.toggleBreakpoint(breakpointId);
			assert.ok(Reflect.isBound(obs), "toggleBreakpoint re-binds observation");

			devtools.deleteBreakpoint(breakpointId);
			assert.ok(!Reflect.isBound(obs), "deleteBreakpoint unbinds observation");

			breakpoints = devtools.addBreakpoint({
				expression: "todos.length",
				observation: obs,
				enabled: false
			}).detail.breakpoints;

			assert.ok(
				!Reflect.isBound(obs),
				"addBreakpoint does not bind observation created with `enabled: false`"
			);

			breakpointId = breakpoints[0].id;

			devtools.toggleBreakpoint(breakpointId);
			assert.ok(
				Reflect.isBound(obs),
				"toggleBreakpoint binds observation created with `enabled: false`"
			);

			devtools.deleteBreakpoint(breakpointId);
			assert.ok(
				!Reflect.isBound(obs),
				"deleteBreakpoint unbinds observation created with `enabled: false`"
			);
		});

		it("handles errors", () => {
			let resp = devtools.addBreakpoint({ error: "no component" });

			assert.equal(resp.status, "error", "status === error");
			assert.equal(resp.detail, "no component", "detail is the error message");
		});
	});

	describe('addBreakpoints', () => {
		it ('adds breakpoints', () => {
			const breakpoints = devtools.addBreakpoints([{
				expression: "todos.length"
			}]).detail.breakpoints;
			assert.equal(breakpoints.length, 1, "addBreakpoints adds breakpoints");
			assert.equal(
				breakpoints[0].expression,
				"todos.length",
				"first breakpoint has correct expression"
			);
			assert.equal(breakpoints[0].enabled, true, "first breakpoint is enabled");
		});
	});
});
