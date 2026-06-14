import lube from "eslint-plugin-lube"
import { parser } from "typescript-eslint"
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
		files: [ "docs/js/math.js" ],
		rules: {
			"no-restricted-imports": [ "error", { patterns: [ "*" ] } ]
		}
	},
	{
		files: [ "docs/js/calc/calc_sens.js" ],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					message: "calc_sens.js: import only ../math.js (worker tree, no state)",
					selector: "ImportDeclaration:not([source.value='../math.js'])"
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
					message: "calc_worker.js: import only ../calc/calc_sens.js + ../math.js (no state off-thread)",
					// eslint-disable-next-line max-len
					selector: "ImportDeclaration:not([source.value='../calc/calc_sens.js']):not([source.value='../math.js'])"
				}
			]
		}
	}
]