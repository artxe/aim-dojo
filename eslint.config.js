// @ts-ignore
import html from "eslint-plugin-html"
import lube from "eslint-plugin-lube"
import { parser } from "typescript-eslint"
/** @type {import("eslint").Linter.Config[]} */
export default [
	{
		files: [
			"**/*.d.ts",
			"**/*.html",
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
		files: [ "**/*.html" ],
		plugins: { html },
		rules: { "eol-last": "off" }
	},
	{
		files: [ "**/*.js" ],
		rules: { "no-unused-vars": "error" }
	}
]