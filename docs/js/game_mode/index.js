import aim_booster from "./aim_booster.js"
import flick from "./flick.js"
import full_tracking from "./full_tracking.js"
import timing from "./timing.js"
import tracking from "./tracking.js"
import twitch from "./twitch.js"
import writing from "./writing.js"
export default /** @type {Record<GameModeName, GameMode>} */({
	get aim_booster() {
		return aim_booster
	},
	get flick() {
		return flick
	},
	get full_tracking() {
		return full_tracking
	},
	get timing() {
		return timing
	},
	get tracking() {
		return tracking
	},
	get twitch() {
		return twitch
	},
	get writing() {
		return writing
	}
})/**/