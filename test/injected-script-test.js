import mocha from "steal-mocha";
import chai from "chai/chai";

import { Component, DefineMap, DefineList, debug, Reflect, Observation } from "can";
import "../canjs-devtools-injected-script";

const assert = chai.assert;

const isElement = (el) => el.toString() === "[object HTMLElement]";

describe("canjs-devtools-injected-script", () => {
    let devtools, windowCan;

    beforeEach(() => {
        // register devtools
        debug();

        // make sure devtools is not using global `can`
        windowCan = window.can;
        delete window.can;

        // get access to devtools functions
        devtools = window.__CANJS_DEVTOOLS__;
    });

    afterEach(() => {
        window.can = windowCan;
    });

    describe("getViewModelData", () => {
        it("basics", () => {
            const C = Component.extend({
                tag: "a-pp",
                view: "<p>{{name}}</p>",
                ViewModel: {
                    first: { type: "string", default: "Kevin" },
                    last: { type: "string", default: "McCallister" },
                    get name() {
                        return this.first + " " + this.last;
                    }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModelData: viewModelDataFromEl,
                tagName: tagNameFromEl,
                type: typeFromEl,
                typeNames: typeNamesFromEl
            } = devtools.getViewModelData(el).detail;

            assert.equal(tagNameFromEl, "<a-pp>", "tagName from el");
            assert.deepEqual(
                viewModelDataFromEl,
                { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
                "viewModelData from el"
            );
            assert.deepEqual(
                typeNamesFromEl,
                {},
                "typeNames from el"
            );

            const {
                viewModelData: viewModelDataFromChild,
                tagName: tagNameFromChild,
                type: typeFromChild,
                typeNames: typeNamesFromChild
            } = devtools.getViewModelData(el.querySelector("p")).detail;

            assert.equal(tagNameFromChild, "<a-pp>", "tagName from child of el");
            assert.deepEqual(
                viewModelDataFromChild,
                { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
                "viewModelData from child of el"
            );
            assert.deepEqual(
                typeNamesFromChild,
                {},
                "typeNames from child of el"
            );
        });

        it("can handle elements", () => {
            const C = Component.extend({
                tag: "app-with-element",
                view: "<p>this app has an element on its viewModelData</p>",
                ViewModel: {
                    element: {
                        default() {
                            return document.createElement("p");
                        }
                    }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModelData,
                typeNames,
                messages
            } = devtools.getViewModelData(el).detail;

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
                { element: { type: "info", message: "CanJS Devtools does not expand HTML Elements" } },
                "gets correct message data"
            );
        });

        it("can handle lists of elements", () => {
            const C = Component.extend({
                tag: "app-with-list-of-elements",
                view: "<p>this app has a list of elements on its viewModel</p>",
                ViewModel: {
                    elements: {
                        default() {
                            return new DefineList([
                                document.createElement("p"),
                                document.createElement("p")
                            ]);
                        }
                    }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModelData,
                typeNames,
                messages
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModelData,
                { elements: { } },
                "gets correct viewModelData data - unexpanded"
            );

            assert.deepEqual(
                typeNames,
                { elements: "DefineList[]" },
                "gets correct name data - unexpanded"
            );

            assert.deepEqual(
                messages,
                {},
                "gets correct message data - unexpanded"
            );

            const {
                viewModelData: viewModelDataListExpanded,
                typeNames: typeNamesListExpanded,
                messages: messagesListExpanded
            } = devtools.getViewModelData(el, { expandedKeys: [ "elements" ] }).detail;

            assert.deepEqual(
                viewModelDataListExpanded,
                { elements: { 0: { }, 1: { } } },
                "gets correct viewModelData data - list expanded"
            );

            assert.deepEqual(
                typeNamesListExpanded,
                {
                    elements: "DefineList[]",
                    "elements.0": "HTMLParagraphElement{}",
                    "elements.1": "HTMLParagraphElement{}"
                },
                "gets correct name data - list expanded"
            );

            assert.deepEqual(
                messagesListExpanded,
                {
                    "elements.0": { type: "info", message: "CanJS Devtools does not expand HTML Elements" },
                    "elements.1": { type: "info", message: "CanJS Devtools does not expand HTML Elements" },
                },
                "gets correct message data - list expanded"
            );
        });

        it("can handle functions", () => {
            const C = Component.extend({
                tag: "app-with-functions",
                view: "<p>this app uses functions</p>",
                ViewModel: {
                    Thing: {
                        default: () => function Thing() {}
                    }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModelData,
                typeNames,
                messages
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModelData,
                { Thing: { } },
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

            const C = Component.extend({
                tag: "circular-app",
                view: "<p>hello</p>",
                ViewModel: {
                    circular: {
                        default: () => circular
                    }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModelData,
                typeNames,
                messages
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModelData,
                { circular: { } },
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
            assert.ok(messages.circular.message.match(/Error getting value of "circular":/))
        });

        it("can handle infinite recursion (#46)", () => {
            const Thing = DefineMap.extend("Thing", {
                anotherThing: {
                    default() {
                        return new Thing();
                    }
                }
            });

            const C = Component.extend({
                tag: "circular-app",
                view: "<p>hello</p>",
                ViewModel: {
                    thing: { Default: Thing }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModelData,
                typeNames
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModelData,
                { thing: { } },
                "gets empty object for recursive property"
            );

            assert.deepEqual(
                typeNames,
                { thing: "Thing{}" },
                "gets correct name"
            );
        });

        it("can handle nulls and undefineds", () => {
            const C = Component.extend({
                tag: "app-with-nulls",
                view: "<p>hello</p>",
                ViewModel: {
                    thisIsNull: { default: null },
                    thisIsUndefined: { default: undefined }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModelData,
                typeNames,
                messages,
                undefineds
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModelData,
                { thisIsNull: null, thisIsUndefined: undefined },
                "gets null for property that is null and undefined for property that is undefined"
            );

            assert.deepEqual(
                undefineds,
                [ "thisIsUndefined" ],
                "gets undefineds array with paths whose value is `undefined`"
            );

            assert.deepEqual(
                messages,
                { },
                "gets no messages"
            );
        });

        it("can handle empty Maps / Lists / Objects / arrays", () => {
            const C = Component.extend({
                tag: "app-with-empties",
                view: "<p>hello</p>",
                ViewModel: {
                    emptyMap: { Default: DefineMap },
                    emptyList: { Default: DefineList },
                    emptyObject: {
                        type: "any",
                        default() {
                            return {};
                        }
                    },
                    emptyArray: {
                        type: "any",
                        default() {
                            return [];
                        }
                    }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModelData,
                typeNames,
                messages
            } = devtools.getViewModelData(el, { expandedKeys: [ "emptyMap", "emptyList", "emptyObject", "emptyArray" ] }).detail;

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
                    emptyMap: "DefineMap{}",
                    emptyList: "DefineList[]",
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
        const C = Component.extend({
            tag: "a-pp",
            view: "<p>{{name}}</p>",
            ViewModel: { }
        });

        const c = new C();
        const el = c.element;

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
            let VM = DefineMap.extend({
                name: "string"
            });

            assert.deepEqual(
                devtools.getSerializedViewModelData(new VM()).viewModelData,
                { name: undefined },
                "works for basic ViewModel"
            );

            VM = DefineMap.extend({
                first: { type: "string", default: "Kevin" },
                last: { type: "string", default: "McCallister" },
                get name() {
                    return this.first + " " + this.last;
                }
            });

            assert.deepEqual(
                devtools.getSerializedViewModelData(new VM()).viewModelData,
                { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
                "works for ViewModel with serialized properties"
            );

            VM = DefineMap.extend({
                hobbies: {
                    default() {
                        return [{ name: "singing" }, { name: "dancing" }];
                    }
                }
            });

            assert.deepEqual(
                devtools.getSerializedViewModelData(new VM()).viewModelData,
                { hobbies: { } },
                "works for DefineMap with nested array - unexpanded"
            );

            assert.deepEqual(
                devtools.getSerializedViewModelData(new VM(), { expandedKeys: [ "hobbies" ] }).viewModelData,
                { hobbies: { 0: { }, 1: { } } },
                "works for DefineMap with nested array - array expanded"
            );

            assert.deepEqual(
                devtools.getSerializedViewModelData(new VM(), { expandedKeys: [ "hobbies", "hobbies.0", "hobbies.1" ] }).viewModelData,
                { hobbies: { 0: { name: "singing" }, 1: { name: "dancing" } } },
                "works for DefineMap with nested array - all expanded"
            );

            VM = DefineMap.extend({
                hobbies: {
                    Type: DefineList.extend("Hobbies", {
                        "#": DefineMap.extend("Hobby", {
                            name: "string"
                        })
                    }),
                    default() {
                        return [{ name: "singing" }, { name: "dancing" }];
                    }
                }
            });

            assert.deepEqual(
                devtools.getSerializedViewModelData(new VM()).viewModelData,
                { hobbies: { } },
                "works for nested DefineMaps - unexpanded"
            );

            assert.deepEqual(
                devtools.getSerializedViewModelData(new VM(), { expandedKeys: [ "hobbies" ] }).viewModelData,
                { hobbies: { 0: { }, 1: { } } },
                "works for nested DefineMaps - array expanded"
            );

            assert.deepEqual(
                devtools.getSerializedViewModelData(new VM(), { expandedKeys: [ "hobbies", "hobbies.0", "hobbies.1" ] }).viewModelData,
                { hobbies: { 0: { name: "singing" }, 1: { name: "dancing" } } },
                "works for nested DefineMaps - everything expanded"
            );
            var PersonName = DefineMap.extend("Name", {
              first: { type: "string", default: "kevin" },
              last: { type: "string", default: "phillips" }
            });

            VM = DefineMap.extend("Person", {
              name: { Default: PersonName },
              age: { default: 32 }
            });

            assert.deepEqual(
                devtools.getSerializedViewModelData(new VM()).viewModelData,
                { age: 32, name: {} },
                "only serializes top-level properties by default"
            );
        });

        it("typeNames", () => {
            const Thing = DefineMap.extend("AThing", {});

            let ViewModel = DefineMap.extend("ViewModel", {
                aThing: { Type: Thing, Default: Thing }
            });

            assert.deepEqual(
                devtools.getSerializedViewModelData(new ViewModel()).typeNames,
                { aThing: "AThing{}" },
                "AThing{} - nothing expanded"
            );

            const ListOfThings = DefineList.extend("ListOfThings", {
                "#": Thing
            });

            ViewModel = DefineMap.extend("ViewModel", {
                things: { Type: ListOfThings, default: () => [{}] }
            });

            assert.deepEqual(
                devtools.getSerializedViewModelData(new ViewModel()).typeNames,
                { things: "ListOfThings[]" },
                "ListOfThings[] - nothing expanded"
            );

            assert.deepEqual(
                devtools.getSerializedViewModelData(new ViewModel(), { expandedKeys: [ "things" ] }).typeNames,
                { things: "ListOfThings[]", "things.0": "AThing{}" },
                "ListOfThings[] - list expanded"
            );

            const Name = DefineMap.extend("Name", {});
            const NamedThing = DefineMap.extend("NamedThing", {
                name: Name
            });
            const ListOfNamedThings = DefineList.extend("ListOfNamedThings", {
                "#": NamedThing
            });

            ViewModel = DefineMap.extend("ViewModel", {
                things: { Type: ListOfNamedThings, default: () => [{ name: {} }] }
            });

            assert.deepEqual(
                devtools.getSerializedViewModelData(new ViewModel()).typeNames,
                { things: "ListOfNamedThings[]" },
                "ListOfNamedThings[] - nothing expanded"
            );
            assert.deepEqual(
                devtools.getSerializedViewModelData(new ViewModel(), { expandedKeys: [ "things" ] }).typeNames,
                { things: "ListOfNamedThings[]", "things.0": "NamedThing{}" },
                "ListOfNamedThings[] - list expanded"
            );
            assert.deepEqual(
                devtools.getSerializedViewModelData(new ViewModel(), { expandedKeys: [ "things", "things.0" ] }).typeNames,
                { things: "ListOfNamedThings[]", "things.0": "NamedThing{}", "things.0.name": "Name{}" },
                "ListOfNamedThings[] - everything expanded"
            );
        });

        it("undefineds", () => {
            const ViewModel = DefineMap.extend({
                thisIsUndefined: { default: undefined },
                obj: {
                    Type: DefineMap,
                    default() {
                        return {
                            thisIsUndefined: undefined
                        };
                    }
                }
            });

            assert.deepEqual(
                devtools.getSerializedViewModelData(new ViewModel()).undefineds,
                [ "thisIsUndefined" ],
                "nothing expanded"
            );

            assert.deepEqual(
                devtools.getSerializedViewModelData(new ViewModel(), { expandedKeys: [ "obj" ] }).undefineds,
                [ "thisIsUndefined", "obj.thisIsUndefined" ],
                "obj expanded"
            );
        });
    });

    it("updateViewModel", () => {
        const C = Component.extend({
            tag: "a-pp",
            view: "<p>{{name}}</p>",
            ViewModel: {
                first: { type: "string", default: "Kevin" },
                last: { type: "string", default: "McCallister" },
                get name() {
                    return this.first + " " + this.last;
                },
                hobbies: {
                    type: "any",
                    default() {
                        return [ "running", "jumping" ];
                    }
                }
            }
        });

        const c = new C();
        const viewModel = c.viewModel;
        const el = c.element;

        assert.deepEqual(
            devtools.getSerializedViewModelData(viewModel, { expandedKeys: [ "hobbies" ] }).viewModelData,
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister", hobbies: { 0: "running", 1: "jumping" } },
            "default viewmodel data"
        );

        devtools.updateViewModel(el, [
            { type: "set", key: "first", value: "Marty" },
            { type: "set", key: "last", value: "McFly" }
        ]);

        assert.deepEqual(
            devtools.getSerializedViewModelData(viewModel, { expandedKeys: [ "hobbies" ] }).viewModelData,
            { first: "Marty", last: "McFly", name: "Marty McFly", hobbies: { 0: "running", 1: "jumping" } },
            "set works"
        );

        devtools.updateViewModel(el, [
            { type: "delete", key: "last" }
        ]);

        assert.deepEqual(
            devtools.getSerializedViewModelData(viewModel, { expandedKeys: [ "hobbies" ] }).viewModelData,
            { first: "Marty", last: undefined, name: "Marty undefined", hobbies: { 0: "running", 1: "jumping" } },
            "delete works"
        );

        devtools.updateViewModel(el, [
            { type: "splice", key: "hobbies", index: 0, deleteCount: 1, insert: [ "skipping" ] }
        ]);

        assert.deepEqual(
            devtools.getSerializedViewModelData(viewModel, { expandedKeys: [ "hobbies" ] }).viewModelData,
            { first: "Marty", last: undefined, name: "Marty undefined", hobbies: { 0: "skipping", 1: "jumping" } },
            "splice works"
        );
    });

    it("getViewModelKeys", () => {
        const C = Component.extend({
            tag: "a-pp",
            view: "<p>{{name}}</p>",
            ViewModel: {
                first: { type: "string", default: "Kevin" },
                last: { type: "string", default: "McCallister" },
                get name() {
                    return this.first + " " + this.last;
                }
            }
        });

        const c = new C();
        const viewModel = c.viewModel;

        assert.deepEqual(
            devtools.getViewModelKeys(viewModel),
            [ "first", "last", "name" ],
            "gets viewmodel keys"
        );

        const list = new DefineList([ { one: "two" }, { three: "four" } ]);
        assert.deepEqual(
            devtools.getViewModelKeys(list),
            [ "0", "1" ],
            "ignore _ keys for DefineList"
        );
    });

    describe("component tree", () => {
        let appOne, appTwo, treeData;
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
            Component.extend({
                tag: "a-child",
                view: "<a-deep-child/>",
                ViewModel: {}
            });

            Component.extend({
                tag: "a-deep-child",
                view: "<p>a deep child</p>",
                ViewModel: {}
            });

            Component.extend({
                tag: "a-nother-child",
                view: "<p><a-nother-deep-child/></p>",
                ViewModel: {}
            });

            Component.extend({
                tag: "a-nother-deep-child",
                view: "<p>another deep child</p>",
                ViewModel: {}
            });

            const App = Component.extend({
                tag: "a-pp",
                view: `
                    <div>
                        <a-child />
                    </div>
                    <a-nother-child/>
                `,
                ViewModel: {}
            });

            const a = new App();
            appOne = a.element;

            const b = new App();
            appTwo = b.element;

            fixture.appendChild(appOne);
            fixture.appendChild(appTwo);

            window.$0 = fixture.querySelector("a-nother-deep-child");

            const resp = devtools.getComponentTreeData();
            treeData = resp.detail.tree;
        });

        after(() => {
            fixture.removeChild(appOne);
            fixture.removeChild(appTwo);
        });

        it("getComponentTreeData", () => {
            assert.deepEqual(treeData, [{
                selected: false,
                tagName: "a-pp",
                id: 0,
                children: [{
                    selected: false,
                    tagName: "a-child",
                    id: 1,
                    children: [{
                        selected: false,
                        tagName: "a-deep-child",
                        id: 2,
                        children: []
                    }]
                }, {
                    selected: false,
                    tagName: "a-nother-child",
                    id: 3,
                    children: [{
                        selected: true,
                        tagName: "a-nother-deep-child",
                        id: 4,
                        children: []
                    }]
                }]
            }, {
                selected: false,
                tagName: "a-pp",
                id: 5,
                children: [{
                    selected: false,
                    tagName: "a-child",
                    id: 6,
                    children: [{
                        selected: false,
                        tagName: "a-deep-child",
                        id: 7,
                        children: []
                    }]
                }, {
                    selected: false,
                    tagName: "a-nother-child",
                    id: 8,
                    children: [{
                        selected: false,
                        tagName: "a-nother-deep-child",
                        id: 9,
                        children: []
                    }]
                }]
            }]);
        });

        it("selectComponentById", () => {
            devtools.selectComponentById(0);
            assert.ok(isElement(devtools.$0), "App");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-pp", "a-pp");

            devtools.selectComponentById(1);
            assert.ok(isElement(devtools.$0), "Child");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-child", "a-child");

            devtools.selectComponentById(2);
            assert.ok(isElement(devtools.$0), "DeepChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-deep-child", "a-deep-child");

            devtools.selectComponentById(3);
            assert.ok(isElement(devtools.$0), "AnotherChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-nother-child", "a-nother-child");

            devtools.selectComponentById(4);
            assert.ok(isElement(devtools.$0), "AnotherDeepChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-nother-deep-child", "a-nother-deep-child");

            devtools.selectComponentById(5);
            assert.ok(isElement(devtools.$0), "App");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-pp", "second a-pp");

            devtools.selectComponentById(6);
            assert.ok(isElement(devtools.$0), "Child");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-child", "second a-child");

            devtools.selectComponentById(7);
            assert.ok(isElement(devtools.$0), "DeepChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-deep-child", "second a-deep-child");

            devtools.selectComponentById(8);
            assert.ok(isElement(devtools.$0), "AnotherChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-nother-child", "second a-nother-child");

            devtools.selectComponentById(9);
            assert.ok(isElement(devtools.$0), "AnotherDeepChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-nother-deep-child", "second a-nother-deep-child");
        });
    });

    describe("add / get / toggle / delete breakpoints", () => {
        it("basics", () => {
            let breakpoints = devtools.addBreakpoint({
                expression: "todos.length"
            }).detail.breakpoints;

            assert.equal(breakpoints.length, 1, "addBreakpoint adds a breakpoint");
            assert.equal(breakpoints[0].expression, "todos.length", "first breakpoint has correct expression");
            assert.equal(breakpoints[0].enabled, true, "first breakpoint is enabled");

            const todosLengthBreakpointId = breakpoints[0].id;

            assert.deepEqual(devtools.getBreakpoints().detail.breakpoints, breakpoints, "getBreakpoints works");

            breakpoints = devtools.addBreakpoint({
                expression: "person.nameChanges > 5"
            }).detail.breakpoints;

            assert.equal(breakpoints.length, 2, "addBreakpoint adds a second breakpoint");
            assert.equal(breakpoints[1].expression, "person.nameChanges > 5", "second breakpoint has correct expression");
            assert.equal(breakpoints[1].enabled, true, "second breakpoint is enabled");

            const nameChangesBreakpointId = breakpoints[1].id;

            assert.deepEqual(devtools.getBreakpoints().detail.breakpoints, breakpoints, "getBreakpoints still works");

            breakpoints = devtools.toggleBreakpoint(todosLengthBreakpointId).detail.breakpoints;
            assert.equal(breakpoints[0].enabled, false, "breakpoint is disabled");
            assert.equal(breakpoints[1].enabled, true, "second breakpoint is enabled");

            breakpoints = devtools.toggleBreakpoint(nameChangesBreakpointId).detail.breakpoints;
            assert.equal(breakpoints[0].enabled, false, "breakpoint is disabled");
            assert.equal(breakpoints[1].enabled, false, "second breakpoint is disabled");

            breakpoints = devtools.toggleBreakpoint(nameChangesBreakpointId).detail.breakpoints;
            assert.equal(breakpoints[0].enabled, false, "breakpoint is still disabled");
            assert.equal(breakpoints[1].enabled, true, "second breakpoint is re-enabled");

            breakpoints = devtools.toggleBreakpoint(todosLengthBreakpointId).detail.breakpoints;
            assert.equal(breakpoints[0].enabled, true, "breakpoint is re-enabled");
            assert.equal(breakpoints[1].enabled, true, "second breakpoint is still enabled");

            breakpoints = devtools.deleteBreakpoint(todosLengthBreakpointId).detail.breakpoints;
            assert.equal(breakpoints.length, 1, "first breakpoint is deleted");
            assert.equal(breakpoints[0].expression, "person.nameChanges > 5", "remaining breakpoint has correct expression");
            assert.equal(breakpoints[0].enabled, true, "remaining breakpoint is enabled");

            breakpoints = devtools.deleteBreakpoint(nameChangesBreakpointId).detail.breakpoints;
            assert.equal(breakpoints.length, 0, "remaining breakpoint is deleted");
        });

        it("binds and unbinds observation", () => {
            const Todos = DefineList.extend("Todos", {});
            const todos = new Todos();
            let obs = new Observation(() => todos.length);
            let breakpoints = devtools.addBreakpoint({
                expression: "todos.length",
                observation: obs
            }).detail.breakpoints;

            const breakpointId = breakpoints[0].id;

            assert.ok(Reflect.isBound(obs), "addBreakpoint binds passed observation");

            devtools.toggleBreakpoint(breakpointId);
            assert.ok(!Reflect.isBound(obs), "toggleBreakpoint unbinds observation");

            devtools.toggleBreakpoint(breakpointId);
            assert.ok(Reflect.isBound(obs), "toggleBreakpoint re-binds observation");

            devtools.deleteBreakpoint(breakpointId);
            assert.ok(!Reflect.isBound(obs), "deleteBreakpoint unbinds observation");
        });

        it("handles errors", () => {
            let resp = devtools.addBreakpoint({ error: "no component" });

            assert.equal(resp.status, "error", "status === error");
            assert.equal(resp.detail, "no component", "detail is the error message");
        });
    });
});
