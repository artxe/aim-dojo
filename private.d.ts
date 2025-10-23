type BackgroundType = "chzzk" | "default" | "soop" | "web_view" | "youtube"
type CameraMode = "2d" | "3d"
type DeepReadonly<T> = Readonly<{
	[K in keyof T]:
		T[K] extends (number | string | symbol)
			? Readonly<T[K]>
			: T[K] extends readonly (infer A)[]
				? ReadonlyArray<DeepReadonly<A>>
				: DeepReadonly<T[K]>
}>
type GameMode = {
	check_stats: () => void
	dispose: () => void
	init: () => void
	on_frame: () => void
	shoot: () => void
	update_fov: () => void
	update_hud: () => void
}
type GameModeName = "aiming" | "flick" | "tracking" | "writing"
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
type VboInfo = Readonly<{
	count: number
	stride: number
	vbo: WebGLBuffer
}>