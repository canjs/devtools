module.exports = {
	env: {
		browser: true,
		es6: true,
		mocha: true
	},
	extends: "eslint:recommended",
	globals: {
		Atomics: "readonly",
		SharedArrayBuffer: "readonly",
		chrome: "readonly",
		inspect: "readonly"
	},
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: "module"
	},
	rules: {}
};
