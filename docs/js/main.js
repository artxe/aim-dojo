import { on_resize } from "./controller/index.js"
import { change_bg_video } from "./controller/menu.js"
import {
	active_game_sens,
	update_game_sens
} from "./ui.js"
change_bg_video()
active_game_sens()
update_game_sens()
on_resize()