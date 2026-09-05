import aim_booster from "./aim_booster.js"
import h_tracking from "./h_tracking.js"
import precision from "./precision.js"
import writing from "./writing.js"
export default /** @type {Record<GameModeName, GameMode>} */({
	get aim_booster() {
		return aim_booster
	},
	get h_tracking() {
		return h_tracking
	},
	get precision() {
		return precision
	},
	get writing() {
		return writing
	}
})/**/