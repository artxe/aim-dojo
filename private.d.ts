type BackgroundType = "default" | "video" | "youtube"
type BgVideo = {
	id: string
	name: string
}
type CameraMode = "2d" | "fps" | "tps"
type DpiNormalizerState = {
	dpi: number
	game: GameSensName
	sens: number
}
type GameMode = {
	check_stats?: () => void
	clear_best_score: () => void
	dispose: () => void
	init: () => void
	on_frame: () => void
	render: () => void
	shoot: () => void
	update_dimension?: () => void
	update_hud: () => void
}
type GameModeName = "aim_booster" | "flick" | "h_tracking" | "timing" | "twitch" | "v_tracking" | "writing"
type GameSensName = "al" | "cs2" | "fn" | "lol" | "mc" | "ow" | "pubg" | "r6" | "sa" | "val"
type Line = {
	ex: number
	ey: number
	sx: number
	sy: number
	t: number
}
interface MediaSource {
	readonly handle: MediaSourceHandle
}
interface MediaSourceHandle {
	readonly __brand: "MediaSourceHandle"
}
type MonitorResolution = "fhd" | "hd" | "qhd"
type Target = {
	cr: number
	cx: number
	cy: number
	r: number
	x: number
	y: number
}
type Target3D = {
	cp: number
	cr: number
	cy: number
	p: number
	r: number
	y: number
}
type Tuple<T, N extends number, R extends T[] = []> = R["length"] extends N
	? R
	: Tuple<T, N, [...R, T]>
type VboInfo = Readonly<{
	count: number
	stride: number
	vbo: WebGLBuffer
}>