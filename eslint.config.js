import lube from "eslint-plugin-lube"
import { parser } from "typescript-eslint"
const state_free_files = [
	"bg_store.js",
	"calc/calc_pubg.js",
	"calc/calc_sens.js",
	"component/select.js",
	"constants.js",
	"controller/dom.js",
	"math.js",
	"pool.js",
	"render/mat4.js",
	"worker/bg_worker.js",
	"worker/calc_worker.js"
]
/**
 * @param {string} dir
 * @param {string} path
 * @returns {string}
 */
function relative_source(dir, path) {
	if (path.startsWith(`${dir}/`)) {
		return `./${path.slice(dir.length + 1)}`
	}
	if (dir) {
		return `../${path}`
	}
	return `./${path}`
}
/**
 * @param {string} dir
 * @returns {import("eslint").Linter.RulesRecord}
 */
function state_free_rules(dir) {
	let selector = "ImportDeclaration"
	for (const path of state_free_files) {
		selector += `:not([source.value='${relative_source(dir, path)}'])`
	}
	return {
		"no-restricted-syntax": [
			"error",
			{
				message: "state-free module: import only state-free modules (state.js needs localStorage)",
				selector
			}
		]
	}
}
/** @type {import("eslint").Linter.Config[]} */
export default [
	{
		files: [
			"**/*.d.ts",
			"**/*.js",
			"**/*.json"
		],
		ignores: [ "docs/lib/**" ],
		languageOptions: {
			ecmaVersion: "latest",
			parser,
			sourceType: "module"
		},
		plugins: lube.configs.plugins,
		rules: {
			...lube.configs.rules,
			"curly": [ "error", "all" ]
		}
	},
	{
		files: [ "**/*.js" ],
		rules: { "no-unused-vars": "error" }
	},
	{
		files: [
			"docs/js/bg_store.js",
			"docs/js/constants.js",
			"docs/js/math.js",
			"docs/js/pool.js"
		],
		rules: state_free_rules("")
	},
	{
		files: [ "docs/js/calc/calc_pubg.js" ],
		rules: state_free_rules("calc")
	},
	{
		files: [ "docs/js/calc/calc_sens.js" ],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					message: "calc_sens.js: import only ../math.js + ../constants.js (worker tree, no state)",
					selector: "ImportDeclaration:not([source.value='../math.js']):not([source.value='../constants.js'])"
				}
			]
		}
	},
	{
		files: [ "docs/js/component/select.js" ],
		rules: state_free_rules("component")
	},
	{
		files: [ "docs/js/controller/dom.js" ],
		rules: state_free_rules("controller")
	},
	{
		files: [ "docs/js/render/mat4.js" ],
		rules: state_free_rules("render")
	},
	{
		files: [ "docs/js/worker/bg_worker.js" ],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					message: "bg_worker.js: import only ../constants.js + ../math.js (no state off-thread)",
					selector: "ImportDeclaration:not([source.value='../constants.js']):not([source.value='../math.js'])"
				}
			]
		}
	},
	{
		files: [
			"docs/js/worker/calc_worker.js"
		],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					// eslint-disable-next-line max-len
					message: "calc_worker.js: import only ../calc/calc_sens.js + ../constants.js + ../math.js (no state off-thread)",
					// eslint-disable-next-line max-len
					selector: "ImportDeclaration:not([source.value='../calc/calc_sens.js']):not([source.value='../constants.js']):not([source.value='../math.js'])"
				}
			]
		}
	}
]