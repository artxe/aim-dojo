import { playwright } from "@vitest/browser-playwright"
import { defaultExclude, defineConfig } from "vitest/config"
export default defineConfig(
	{
		test: {
			coverage: {
				include: [
					"cloudflare/**/*.js",
					"docs/js/**/*.js",
					"scripts/**/*.js"
				],
				thresholds: {
					"cloudflare/**/*.js": { 100: true },
					"docs/js/bg_store.js": { 100: true },
					"docs/js/calc/**": { 100: true },
					"docs/js/constants.js": { 100: true },
					"docs/js/controller/cpi_norm.js": { 100: true },
					"docs/js/controller/hud.js": { 100: true },
					"docs/js/controller/window.js": { 100: true },
					"docs/js/game_mode/**": { 100: true },
					"docs/js/i18n.js": { 100: true },
					"docs/js/logic.js": { 100: true },
					"docs/js/math.js": { 100: true },
					"docs/js/render/camera.js": { 100: true },
					"docs/js/render/mat4.js": { 100: true },
					"docs/js/state.js": { 100: true },
					"docs/js/struct/**": { 100: true },
					"docs/js/worker/manager.js": { 100: true },
					"docs/js/worker/writing_worker.js": { 100: true },
					"scripts/lib/**": { 100: true }
				}
			},
			projects: [
				{
					extends: true,
					test: {
						exclude: [
							...defaultExclude,
							"tests/browser/**"
						],
						include: [ "tests/node/**/*.test.js" ],
						name: "node"
					}
				},
				{
					extends: true,
					test: {
						browser: {
							enabled: true,
							headless: true,
							instances: [ { browser: "chromium" } ],
							provider: playwright()
						},
						include: [ "tests/browser/**/*.test.js" ],
						name: "browser"
					}
				}
			]
		}
	}
)