import mocha from "steal-mocha";
import chai from "chai/chai";

import { Component, DefineMap, DefineList, debug, Reflect, Observation, queues } from "can";

const assert = chai.assert;

describe("canjs-devtools-helpers", () => {
    let helpers, windowChrome, chrome;

    beforeEach((done) => {
        // store original chrome api (it probably doesn't exist)
        windowChrome = window.chrome;

        chrome = {
            devtools: {},
            runtime: { onMessage: { addListener() {} } }
        };
        window.chrome = chrome;

        steal.import("canjs-devtools-helpers.mjs")
            .then((mod) => {
                helpers = mod.default;
                done();
            });
    });

    afterEach(() => {
        window.chrome = windowChrome;
    });

    describe("runDevtoolsFunction", () => {
        let evalCalls;

        beforeEach(() => {
            evalCalls = [];

            chrome.devtools = {
                inspectedWindow: {
                    eval(fnString, options, callback) {
                        evalCalls.push({
                            fnString: fnString.split("__CANJS_DEVTOOLS__.")[1],
                            url: options.frameURL
                        });

                        // call success/error callback to make sure refresh happens
                        callback();
                    }
                }
            };
        });

        it("makes an eval call to each registered frame", () => {
            helpers.registeredFrames = { "www.one.com": true, "www.two.com": true };

            const teardown = helpers.runDevtoolsFunction({
                fnString: "fooBar()"
            });

            assert.equal(evalCalls.length, 2);

            assert.equal(evalCalls[0].fnString, "fooBar()");
            assert.equal(evalCalls[0].url, "www.one.com");

            assert.equal(evalCalls[1].fnString, "fooBar()");
            assert.equal(evalCalls[1].url, "www.two.com");

            // clean up frameChangeHandlers so this doesn't break other tests
            teardown();
        });

        it("refreshes data every refreshInterval for frames that are still active", (done) => {
            const refreshInterval = 5;
            const refreshAllInterval = 10;

            helpers.registeredFrames = {};

            const teardown = helpers.runDevtoolsFunction({
                fnString: "fooBar()",
                refreshInterval,
                refreshAllInterval
            });

            assert.equal(evalCalls.length, 0, "should not call eval if there are no frames");

            helpers.registeredFrames = { "www.one.com": true, "www.two.com": true };

            assert.equal(evalCalls.length, 2, "when frames change, should call eval for each frame");

            assert.equal(evalCalls[0].fnString, "fooBar()");
            assert.equal(evalCalls[0].url, "www.one.com");

            assert.equal(evalCalls[1].fnString, "fooBar()");
            assert.equal(evalCalls[1].url, "www.two.com");

            setTimeout(() => {
                assert.equal(evalCalls.length, 4, "should refresh data every refresh interval");

                assert.equal(evalCalls[2].fnString, "fooBar()");
                assert.equal(evalCalls[2].url, "www.one.com");

                assert.equal(evalCalls[3].fnString, "fooBar()");
                assert.equal(evalCalls[3].url, "www.two.com");

                // remove second frame
                helpers.registeredFrames = { "www.one.com": true };

                assert.equal(evalCalls.length, 5, "should not refresh data for removed frame");

                assert.equal(evalCalls[4].fnString, "fooBar()");
                assert.equal(evalCalls[4].url, "www.one.com");

                // replace frame with a new one
                helpers.registeredFrames = { "www.three.com": true };

                assert.equal(evalCalls.length, 6, "should load data for new frame");

                assert.equal(evalCalls[5].fnString, "fooBar()");
                assert.equal(evalCalls[5].url, "www.three.com");

                // stop refreshing so this doesn't break other tests
                teardown();
                done();
            }, refreshInterval);
        });
    });

    describe("getBreakpointEvalString", () => {
        let $0, devtools, debuggerHitCount, mock;

        beforeEach(() => {
            $0 = { [Symbol.for('can.viewModel')]: {} };

            devtools = {
                $0,
                canReflect: Reflect,
                canObservation: Observation,
                canQueues: queues,
                register() {}
            };

            window.__CANJS_DEVTOOLS__ = devtools;

            // mock debugger so we can track when it is read
            debuggerHitCount = 0;
            mock = {
                get _debugger() {
                    debuggerHitCount++;
                }
            };
        });

        afterEach(() => {
            delete window.__CANJS_DEVTOOLS__;
            $0 = null;
        });

        describe("can be created with expression", () => {
            it("hobbies.length", () => {
                let devtoolsVM = new (DefineMap.extend("DevtoolsVM", {
                    hobbies: { Default: DefineList }
                }));

                $0[Symbol.for('can.viewModel')] = devtoolsVM;

                let str = helpers.getBreakpointEvalString({
                    expression: "hobbies.length",
                    debuggerStatement: "mock._debugger"
                });
                let breakpoint = eval( str );

                assert.equal(breakpoint.expression, "DevtoolsVM{}.hobbies.length");
                assert.equal(Reflect.getValue(breakpoint.observation), devtoolsVM.hobbies.length, "obs === hobbies.length");

                Reflect.onValue(breakpoint.observation, () => {});

                devtoolsVM.hobbies.push("skiing");
                assert.equal(debuggerHitCount, 1, "debugger hit once");

                devtoolsVM.hobbies.push("badminton");
                assert.equal(debuggerHitCount, 2, "debugger hit again");
            });

            it("hobbies.length > 1", () => {
                let devtoolsVM = new (DefineMap.extend("DevtoolsVM", {
                    hobbies: { Default: DefineList }
                }));

                $0[Symbol.for('can.viewModel')] = devtoolsVM;

                let str = helpers.getBreakpointEvalString({
                    expression: "hobbies.length > 1",
                    debuggerStatement: "mock._debugger"
                });
                let breakpoint = eval( str );

                assert.equal(breakpoint.expression, "DevtoolsVM{}.hobbies.length > 1");
                assert.equal(Reflect.getValue(breakpoint.observation), false, "obs === false");

                Reflect.onValue(breakpoint.observation, () => {});

                devtoolsVM.hobbies.push("skiing");
                assert.equal(debuggerHitCount, 0, "debugger not hit");

                devtoolsVM.hobbies.push("badminton");
                assert.equal(debuggerHitCount, 1, "debugger hit once");

                devtoolsVM.hobbies.push("luge");
                assert.equal(debuggerHitCount, 1, "debugger not hit again");
            });

            it("hobbies.length > counter", () => {
                let devtoolsVM = new (DefineMap.extend("DevtoolsVM", {
                    hobbies: { Default: DefineList },
                    counter: { default: 2 }
                }));

                $0[Symbol.for('can.viewModel')] = devtoolsVM;

                let str = helpers.getBreakpointEvalString({
                    expression: "hobbies.length > counter",
                    debuggerStatement: "mock._debugger"
                });
                let breakpoint = eval( str );

                assert.equal(breakpoint.expression, "DevtoolsVM{}.hobbies.length > DevtoolsVM{}.counter");
                assert.equal(Reflect.getValue(breakpoint.observation), false, "has correct value");

                Reflect.onValue(breakpoint.observation, () => {});

                devtoolsVM.hobbies.push("skiing");
                assert.equal(debuggerHitCount, 0, "debugger not hit");

                devtoolsVM.hobbies.push("badminton");
                assert.equal(debuggerHitCount, 0, "debugger still not hit");

                devtoolsVM.hobbies.push("curling");
                assert.equal(debuggerHitCount, 1, "debugger hit");

                devtoolsVM.hobbies.push("fencing");
                assert.equal(debuggerHitCount, 1, "debugger not hit again");
            });

            it("returns an error if no componentelement is selected", () => {
                window.__CANJS_DEVTOOLS__.$0 = null;

                let str = helpers.getBreakpointEvalString({
                    expression: "hobbies.length",
                    debuggerStatement: "mock._debugger"
                });
                let breakpoint = eval( str );

                assert.equal(breakpoint.error, "Please select a component in order to create a mutation breakpoint for its ViewModel");
            });

            it("hobbies.length works when hobbies does not exist", () => {
                let devtoolsVM = new (DefineMap.extend("DevtoolsVM", {
                    hobbies: { Type: DefineList }
                }));

                $0[Symbol.for('can.viewModel')] = devtoolsVM;

                let str = helpers.getBreakpointEvalString({
                    expression: "hobbies.length",
                    debuggerStatement: "mock._debugger"
                });
                let breakpoint = eval( str );

                assert.equal(breakpoint.expression, "DevtoolsVM{}.hobbies.length");
                assert.equal(Reflect.getValue(breakpoint.observation), undefined, "obs === undefined");

                Reflect.onValue(breakpoint.observation, () => {});

                devtoolsVM.hobbies = [];
                assert.equal(debuggerHitCount, 1, "debugger hit once");

                devtoolsVM.hobbies.push("skiing");
                assert.equal(debuggerHitCount, 2, "debugger hit again");

                devtoolsVM.hobbies = [ "dancing" ];
                assert.equal(debuggerHitCount, 3, "debugger hit when list changes to new list of same length");
            });
        });

        describe("can be restored with expression", () => {
            beforeEach(() => {
                const $0 = devtools.$0;
                delete devtools.$0;
                devtools.getComponentByPath = () => {
                    return $0;
                };
            });

            afterEach(() => {
                delete devtools.getComponentByPath;
            });

            it("hobbies.length", () => {
                let devtoolsVM = new (DefineMap.extend("DevtoolsVM", {
                    hobbies: { Default: DefineList }
                }));

                $0[Symbol.for('can.viewModel')] = devtoolsVM;

                let str = helpers.getBreakpointEvalString({
                    expression: "DevtoolsVM{}.hobbies.length",
                    displayExpression: "DevtoolsVM{}.hobbies.length",
                    selectedComponentStatement: 'window.__CANJS_DEVTOOLS__.getComponentByPath("0")',
                    observationExpression: "(vm.hobbies && vm.hobbies.length)",
                    debuggerStatement: "mock._debugger"
                });
                let breakpoint = eval( str );

                assert.equal(breakpoint.expression, "DevtoolsVM{}.hobbies.length");
                assert.equal(Reflect.getValue(breakpoint.observation), devtoolsVM.hobbies.length, "obs === hobbies.length");

                Reflect.onValue(breakpoint.observation, () => {});

                devtoolsVM.hobbies.push("skiing");
                assert.equal(debuggerHitCount, 1, "debugger hit once");

                devtoolsVM.hobbies.push("badminton");
                assert.equal(debuggerHitCount, 2, "debugger hit again");
            });
        });
    });

    it("getObservationExpression", () => {
        [
            [ "hobbies", "vm.hobbies" ],
            [ "hobbies.length", "(vm.hobbies && vm.hobbies.length)" ],
            [ "hobbies.length > 1", "(vm.hobbies && vm.hobbies.length) > 1" ],
            [ "hobbies.length > counter", "(vm.hobbies && vm.hobbies.length) > vm.counter" ],
        ].forEach(([ input, expected]) => {
            assert.equal(
                helpers.getObservationExpression(input),
                expected,
                `helpers.getObservationExpression(${input}) === ${expected}`
            );
        });
    });
});
