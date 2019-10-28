import { assert } from "chai/chai";
import "steal-mocha";

import Panel from "./panel.mjs";
import helpers from "../canjs-devtools-helpers.mjs";

describe("canjs-devtools-panel", () => {
	let origRunDevtoolsFunction = helpers.runDevtoolsFunction;

	beforeEach(() => {
		helpers.runDevtoolsFunction = () => {};
	});

	afterEach(() => {
		helpers.runDevtoolsFunction = origRunDevtoolsFunction;
	});

	it("panelError", () => {
		const vm = new Panel();
		vm.initialize();
		vm.listenTo("panelError", () => {});

		assert.equal(vm.panelError, undefined, "no error by default");

		vm.panelError = "there was an error";
		assert.equal(vm.panelError, "there was an error", "error can be set");

		vm.selectedNode = {};
		assert.equal(
			vm.panelError,
			undefined,
			"error is reset when a node is selected"
		);
	});

	it("breakpointsError", () => {
		const vm = new Panel();
		vm.initialize();
		vm.listenTo("breakpointsError", () => {});

		assert.equal(
			vm.breakpointsError,
			undefined,
			"no breakpointsError by default"
		);

		vm.breakpointsError = "there was an error";
		assert.equal(
			vm.breakpointsError,
			"there was an error",
			"breakpointsError can be set"
		);

		vm.selectedNode = {};
		assert.equal(
			vm.breakpointsError,
			undefined,
			"breakpointsError is reset when a node is selected"
		);
	});

	it("viewModelData", () => {
		const vm = new Panel();
		vm.initialize();
		vm.listenTo("viewModelData", () => {});

		assert.equal(vm.viewModelData, undefined, "no viewModelData by default");

		vm.viewModelData = { foo: "bar" };
		assert.deepEqual(
			vm.viewModelData.serialize(),
			{ foo: "bar" },
			"viewModelData can be set"
		);

		vm.selectedNode = {};
		assert.deepEqual(
			vm.viewModelData.serialize(),
			{},
			"viewModelData is reset when a node is selected"
		);
	});

	it("typeNamesData", () => {
		const vm = new Panel();
		vm.initialize();
		vm.listenTo("typeNamesData", () => {});

		assert.equal(vm.typeNamesData, undefined, "no typeNamesData by default");

		vm.typeNamesData = { foo: "bar" };
		assert.deepEqual(
			vm.typeNamesData.serialize(),
			{ foo: "bar" },
			"typeNamesData can be set"
		);

		vm.selectedNode = {};
		assert.deepEqual(
			vm.typeNamesData.serialize(),
			{},
			"typeNamesData is reset when a node is selected"
		);
	});

	it("messages", () => {
		const vm = new Panel();
		vm.initialize();
		vm.listenTo("messages", () => {});

		assert.equal(vm.messages, undefined, "no messages by default");

		vm.messages = { foo: "bar" };
		assert.deepEqual(
			vm.messages.serialize(),
			{ foo: "bar" },
			"messages can be set"
		);

		vm.selectedNode = {};
		assert.deepEqual(
			vm.messages.serialize(),
			{},
			"messages is reset when a node is selected"
		);
	});

	it("undefineds", () => {
		const vm = new Panel();
		vm.initialize();
		vm.listenTo("undefineds", () => {});

		assert.equal(vm.undefineds, undefined, "no undefineds by default");

		vm.undefineds = ["foo", "bar"];
		assert.deepEqual(
			vm.undefineds.serialize(),
			["foo", "bar"],
			"undefineds can be set"
		);

		vm.selectedNode = {};
		assert.deepEqual(
			vm.undefineds.serialize(),
			[],
			"undefineds is reset when a node is selected"
		);
	});
});
