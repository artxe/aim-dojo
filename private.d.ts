type BackgroundType = "default" | "soop" | "webview" | "youtube"
type CameraMode = "2d" | "3d"
type DpiNormalizerState = {
	dpi: number
	game: GameSensName
	sens: number
} & (
	{
		game: "cs2"
	} & (
		{
			fov: "hipfire"
		} | {
			fov: "aug" | "awp"
			zoom: number
		}
	) | {
		game: "fn"
	} & (
		{
			fov: "hipfire"
		} | {
			fov: "ads"
			zoom: number
		}
	) | {
		game: "lol"
	} | {
		game: "mc"
	} | {
		game: "ow"
	} & (
		{
			fov: "hipfire"
		} | {
			fov: "ashe" | "freja" | "widow"
			zoom: number
		}
	) | {
		fov: "tpp" | "x1" | "x2" | "x3" | "x4" | "x6" | "x8" | "x15"
		game: "pubg"
	} | {
		fov: "normal" | "wide"
		game: "sa"
	} | {
		game: "val"
	} & (
		{
			fov: "hipfire"
		} | {
			fov: "guardian" | "marshal" | "operator" | "spectre" | "vandal"
			zoom: number
		}
	)
)
type GameMode = {
	check_stats: () => void
	dispose: () => void
	init: () => void
	on_frame: () => void
	render: () => void
	shoot: () => void
	update_fov: () => void
	update_hud: () => void
}
type GameModeName = "aim_booster" | "flick" | "tracking" | "twitch" | "v_tracking" | "writing"
type GameSensName = "cs2" | "fn" | "lol" | "mc" | "ow" | "pubg" | "sa" | "val"
type Line = {
	e: {
		x: number
		y: number
	}
	s: {
		x: number
		y: number
	}
	t: number
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
type WorkerFunctionName = "check_writing_stats" | "update_game_sens"