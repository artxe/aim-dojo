type AdsStage = 0 | 1 | 2
type BackgroundType = "default" | "none" | "video" | "youtube"
type BgSpec = {
	type: BackgroundType
	video_id: string
	youtube_link: string
}
type BgUniforms = Record<
	"canvas_h" | "dpr" | "dx" | "height" | "sh" | "sw" | "sx" | "sy" | "tile" | "vh" | "vw",
	WebGLUniformLocation | null
>
type BgVideo = {
	id: string
	name: string
}
type CpiNormalizerState = {
	cpi: number
	game: GameSensName
	sens: number
	x: number
}
type FovAxis = "43" | "h" | "v"
type FovAxisGroup = Record<string, unknown> & { axis: FovAxis }
type FovConstants = Record<
	GameSensName,
	FovAxisGroup & { scopes?: FovAxisGroup }
>
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
type GameModeName =
	| "aim_booster"
	| "flick"
	| "flick_180"
	| "h_tracking"
	| "timing"
	| "twitch"
	| "v_tracking"
	| "writing"
type GameSensName = "al" | "bdo" | "cs2" | "fn" | "lol" | "mc" | "ow" | "pubg" | "r6" | "rb" | "sa" | "val"
type LangName = "en" | "ko"
type LangText = Record<LangName, string>
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
type PubgFov = 80 | 103
type R6FileSens = {
	ads_unit: number
	x1: number
	x12: number
	x1_5: number
	x2: number
	x2_5: number
	x3: number
	x4: number
	x5: number
	yaw: number
	yaw_unit: number
}
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
type TutorialStep = {
	el: HTMLElement | null
	game?: GameSensName
	keys: LangText
	text: LangText
}
type VboInfo = Readonly<{
	count: number
	stride: number
	vbo: WebGLBuffer
}>