import lube from "eslint-plugin-lube"
import { parser } from "typescript-eslint"

/** @type {import("eslint").Linter.Config[]} */
export default [
	{ ignores: [ "docs/lib/**" ] },
	{
		...lube.configs,
		files: [ "**/*.d.ts", "**/*.js" ],
		languageOptions: {
			ecmaVersion: "latest",
			parser,
			sourceType: "module"
		},
		rules: {
			...lube.configs.rules,
			"no-unused-vars": "error"
		}
	},
	{
		files: [ "**/*.d.ts" ],
		rules: { "no-unused-vars": "off" }
	}
]