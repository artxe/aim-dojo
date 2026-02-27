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
	}
]