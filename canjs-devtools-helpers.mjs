const helpers = {
	frameChangeHandlers: [],

	onFrameChange(fn) {
		this.frameChangeHandlers.push(fn);
	},

	offFrameChange(fn) {
		const index = this.frameChangeHandlers.indexOf(fn);
		if (index > -1) {
			this.frameChangeHandlers.splice(index, 1);
		}
	},

	runFrameChangeHandlers() {
		// copy handlers to new array
		// since calling the handlers will add to the original array
		const handlers = this.frameChangeHandlers.slice(0);

		// reset handlers
		this.frameChangeHandlers = [];

		// call handlers in new array
		for (let handler of handlers) {
			handler();
		}
	},

	// URLs of all frames that have registered that they
	// have a global `can` present
	_registeredFrames: {},

	get registeredFrames() {
		return this._registeredFrames;
	},

	set registeredFrames(frames) {
		this._registeredFrames = frames;
		this.runFrameChangeHandlers();
	},

	// breakpoints loaded from background script when page is loaded
	storedBreakpoints: [],

	runDevtoolsFunction(options) {
		const timeoutIds = [];

		const runDevtoolsFunctionForUrl = url => {
			const refreshDataForThisUrl = () => {
				if (options.refreshInterval) {
					const timeoutId = setTimeout(() => {
						runDevtoolsFunctionForUrl(url);
					}, options.refreshInterval);

					timeoutIds.push(timeoutId);
				}
			};

			if (helpers.registeredFrames[url]) {
				chrome.devtools.inspectedWindow.eval(
					`typeof __CANJS_DEVTOOLS__ === 'object' && __CANJS_DEVTOOLS__.${
						options.fn ? options.fn() : options.fnString
					}`,
					{ frameURL: url },
					(result, exception) => {
						if (exception) {
							refreshDataForThisUrl();
							return;
						}

						if (options.success) {
							options.success(result);
						}

						refreshDataForThisUrl();
					}
				);
			} else {
				if (options.success) {
					// if there were frames before, and there are no frames now
					// reset data to the "empty" state
					options.success({
						status: "success",
						detail: {}
					});
				}
			}
		};

		// teardown function
		const teardown = () => {
			timeoutIds.forEach(id => {
				clearTimeout(id);
			});

			this.offFrameChange(frameChangeHandler);
		};

		const frameChangeHandler = () => {
			// remove old `refreshDataForThisUrl` timeouts
			teardown();

			// run function for all new frames
			runDevtoolsFunctionForAllUrls();
		};

		const runDevtoolsFunctionForAllUrls = () => {
			const frameURLs = Object.keys(helpers.registeredFrames);

			if (frameURLs.length) {
				frameURLs.forEach(url => {
					runDevtoolsFunctionForUrl(url);
				});
			}

			// when a frame is added or removed
			// remove the old refresh handlers
			// and re-create them
			// If the handler *does not* refresh,
			//   do not rerun it.
			if(options.refreshInterval) {
				this.onFrameChange(frameChangeHandler);
			}
		};

		runDevtoolsFunctionForAllUrls();

		return teardown;
	},

	getSafeKey(key, prependStr) {
		const parts = key.split(".");
		let last = "";

		const safeParts = parts.reduce((newParts, key) => {
			last = last ? `${last}.${key}` : `${prependStr}.${key}`;
			newParts.push(last);
			return newParts;
		}, []);

		if (parts.length > 1) {
			return `(${safeParts.join(" && ")})`;
		} else {
			return safeParts.join(" && ");
		}
	},

	getObservationExpression(expression) {
		return expression.replace(
			/(^|\s|=|>|<|!|\/|%|\+|-|\*|&|\(|\)|~|\?|,|\[|\])([A-Za-z_:.]*)/g,
			(match, delimiter, key) => {
				return `${delimiter}${key ? this.getSafeKey(key, "vm") : ""}`;
			}
		);
	},

	getDisplayExpression(expression) {
		return expression.replace(
			/(^|\s|=|>|<|!|\/|%|\+|-|\*|&|\(|\)|~|\?|,|\[|\])([A-Za-z_])/g,
			(match, delimiter, prop) => {
				return `${delimiter}$\{vmName}.${prop}`;
			}
		);
	},

	isBooleanExpression(expression) {
		return /[!=<>]/.test(expression);
	},

	getBreakpointEvalString({
		expression,
		enabled = true,
		observationExpression = this.getObservationExpression(expression),
		selectedComponentStatement = "window.__CANJS_DEVTOOLS__.$0",
		displayExpression = this.getDisplayExpression(expression),
		pathStatement = "window.__CANJS_DEVTOOLS__.pathOf$0",
		debuggerStatement = "debugger", // overwritable for testing
		id
	}) {
		const isBooleanExpression = this.isBooleanExpression(observationExpression);

		return `(function() {
				const Observation = window.__CANJS_DEVTOOLS__.canObservation;
				const queues = window.__CANJS_DEVTOOLS__.canQueues;
				const selectedComponent = ${selectedComponentStatement};

				if (!selectedComponent) {
						return { error: "Please select a component in order to create a mutation breakpoint for its Observable Properties" };
				}

				const vm = selectedComponent[Symbol.for('can.viewModel')];
				const vmName = window.__CANJS_DEVTOOLS__.canReflect.getName(vm);
				let oldValue = ${observationExpression};

				const observation = new Observation(() => {
						return ${observationExpression};
				});
				const origDependencyChange = observation.dependencyChange;

				observation.dependencyChange = function() {
						const newValue = ${observationExpression};
						${
							isBooleanExpression
								? `if (newValue == true && oldValue != true) { queues.logStack(); ${debuggerStatement}; }`
								: `queues.logStack();
							${debuggerStatement};`
						}
						oldValue = newValue;

						return origDependencyChange.apply(this, arguments);
				};

				return {
						expression: \`${displayExpression}\`,
						observation: observation,
						observationExpression: \`${observationExpression}\`,
						path: ${pathStatement},
						enabled: ${enabled},
						${ typeof id !== "undefined" ? `id: ${id}` : "" }
				};
		}())`;
	}
};

if (typeof chrome === "object" && chrome.runtime && chrome.runtime.onMessage) {
	// listen to messages from the background script
	chrome.runtime.onMessage.addListener((msg) => {
		switch (msg.type) {
			case "__CANJS_DEVTOOLS_UPDATE_FRAMES__":
				helpers.registeredFrames = msg.frames;
				break;
			case "__CANJS_DEVTOOLS_UPDATE_BREAKPOINTS__":
				helpers.storedBreakpoints = msg.breakpoints;
				break;
		}
	});

	// when a devtools panel is opened, request an updated list of frames
	var port = chrome.runtime.connect({ name: "canjs-devtools" });
	port.postMessage({ type: "canjs-devtools-loaded" });
}

export default helpers;
