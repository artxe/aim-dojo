import aim_booster from "./aim_booster.js"
import flick from "./flick.js"
import h_tracking from "./h_tracking.js"
import timing from "./timing.js"
import twitch from "./twitch.js"
import v_tracking from "./v_tracking.js"
import writing from "./writing.js"
export default /** @type {Record<GameModeName, GameMode>} */({
	get aim_booster() {
		return aim_booster
	},
	get flick() {
		return flick
	},
	get h_tracking() {
		return h_tracking
	},
	get timing() {
		return timing
	},
	get twitch() {
		return twitch
	},
	get v_tracking() {
		return v_tracking
	},
	get writing() {
		return writing
	}
})/**/