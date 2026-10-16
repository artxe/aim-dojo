import "./side.js"
import { b } from "./b.js"
import { x, y, z } from "./sub/a.js"
import { join } from "node:path"
export default [
	b,
	join("x"),
	new Worker(
		new URL("./worker.js", import.meta.url),
		{ type: "module" }
	),
	import("./lazy.js"),
	x,
	y,
	z
]