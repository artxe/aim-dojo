import constants from "./constants.js"
import { EPS, abs, ceil, max, random, round, tanh } from "./math.js"
import state from "./state.js"
const context = new AudioContext()
const limiter = context.createWaveShaper()
const limiter_input = context.createGain()
const master = context.createGain()
const sound_buffers = Promise.all(
	[
		(() => {
			const sr = context.sampleRate
			const off = new OfflineAudioContext(1, ceil(sr * .22), sr)
			const base_hz = 1_900
			const lowpass = off.createBiquadFilter()
			const partial_decays = [ .16, .05 ]
			const partial_gains = [ .6, .12 ]
			const partial_ratios = [ 1, 2.756 ]
			lowpass.frequency.value = 6_000
			lowpass.Q.value = .5
			lowpass.type = "lowpass"
			lowpass.connect(off.destination)
			for (let i = 0; i < partial_ratios.length; i++) {
				const env = off.createGain()
				const osc = off.createOscillator()
				env.gain.setValueAtTime(0, 0)
				env.gain.linearRampToValueAtTime(partial_gains[i], .001_5)
				env.gain.exponentialRampToValueAtTime(
					.000_01,
					.001_5 + partial_decays[i]
				)
				osc.type = "sine"
				osc.frequency.value = base_hz * partial_ratios[i]
				osc.connect(env)
					.connect(lowpass)
				osc.start(0)
				osc.stop(.22)
			}
			add_tick(off, .5)
			return off.startRendering()
				.then(
					buffer => finish_buffer(buffer, .5)
				)
		})(),
		(() => {
			const sr = context.sampleRate
			const off = new OfflineAudioContext(1, ceil(sr * .055), sr)
			add_tick(off, 1)
			return off.startRendering()
				.then(
					buffer => finish_buffer(buffer, .45)
				)
		})(),
		(() => {
			const sr = context.sampleRate
			const off = new OfflineAudioContext(1, ceil(sr * .09), sr)
			const lowpass = off.createBiquadFilter()
			const noise = off.createBufferSource()
			const noise_buffer = off.createBuffer(1, round(sr * .03), sr)
			const noise_data = noise_buffer.getChannelData(0)
			const noise_env = off.createGain()
			const osc = off.createOscillator()
			const osc_env = off.createGain()
			for (let i = 0; i < noise_data.length; i++) {
				noise_data[i] = random() * 2 - 1
			}
			lowpass.frequency.value = 300
			lowpass.type = "lowpass"
			noise.buffer = noise_buffer
			noise_env.gain.setValueAtTime(0, 0)
			noise_env.gain.linearRampToValueAtTime(.3, .003)
			noise_env.gain.exponentialRampToValueAtTime(.000_1, .03)
			osc.frequency.setValueAtTime(150, 0)
			osc.frequency.exponentialRampToValueAtTime(80, .05)
			osc.type = "sine"
			osc_env.gain.setValueAtTime(0, 0)
			osc_env.gain.linearRampToValueAtTime(1, .003)
			osc_env.gain.exponentialRampToValueAtTime(.000_1, .07)
			noise.connect(lowpass)
				.connect(noise_env)
				.connect(off.destination)
			osc.connect(osc_env)
				.connect(off.destination)
			noise.start(0)
			osc.start(0)
			osc.stop(.09)
			return off.startRendering()
				.then(
					buffer => finish_buffer(buffer, .35)
				)
		})()
	]
)
let audio_visible = !document.hidden
/** @type {AudioBuffer} */
let crit_sound
/** @type {AudioBuffer} */
let hit_sound
/** @type {AudioBuffer} */
let miss_sound
/**
 * @param {OfflineAudioContext} off
 * @param {number} level
 * @returns {void}
 */
function add_tick(off, level) {
	const { sampleRate: sr } = off
	const bandpass = off.createBiquadFilter()
	const body = off.createOscillator()
	const body_env = off.createGain()
	const noise = off.createBufferSource()
	const noise_buffer = off.createBuffer(1, round(sr * .01), sr)
	const noise_data = noise_buffer.getChannelData(0)
	const noise_env = off.createGain()
	for (let i = 0; i < noise_data.length; i++) {
		noise_data[i] = random() * 2 - 1
	}
	bandpass.frequency.value = 2_200
	bandpass.Q.value = 1.5
	bandpass.type = "bandpass"
	body.frequency.setValueAtTime(1_050, 0)
	body.frequency.exponentialRampToValueAtTime(800, .02)
	body.type = "sine"
	body_env.gain.setValueAtTime(0, 0)
	body_env.gain.linearRampToValueAtTime(level * .7, .000_5)
	body_env.gain.exponentialRampToValueAtTime(level * .000_07, .045)
	noise.buffer = noise_buffer
	noise_env.gain.setValueAtTime(0, 0)
	noise_env.gain.linearRampToValueAtTime(level * .5, .000_3)
	noise_env.gain.exponentialRampToValueAtTime(level * .000_05, .01)
	body.connect(body_env)
		.connect(off.destination)
	noise.connect(bandpass)
		.connect(noise_env)
		.connect(off.destination)
	body.start(0)
	body.stop(.05)
	noise.start(0)
}
/**
 * @param {AudioBuffer} buffer
 * @param {number} peak
 * @returns {AudioBuffer}
 */
function finish_buffer(buffer, peak) {
	const data = buffer.getChannelData(0)
	const fade = round(buffer.sampleRate * .005)
	let data_peak = 0
	for (let i = 0; i < data.length; i++) {
		data_peak = max(data_peak, abs(data[i]))
	}
	const scale = peak / data_peak
	for (let i = 0; i < data.length; i++) {
		const remain = data.length - i
		data[i] *= remain < fade ? scale * remain / fade : scale
	}
	return buffer
}
/** @returns {number} */
export function get_audio_time() {
	return context.currentTime
}
/**
 * @param {AudioBuffer} buffer
 * @returns {void}
 */
function play_buffer(buffer) {
	if (!audio_visible || !buffer) {
		return
	}
	const t = get_audio_time()
	wake_audio(t)
	const src = context.createBufferSource()
	src.buffer = buffer
	src.connect(master)
	src.start(t)
}
/** @returns {void} */
export function play_hit() {
	play_buffer(hit_sound)
}
/** @returns {void} */
export function play_miss() {
	play_buffer(miss_sound)
}
/**
 * @param {boolean} is_hit
 * @param {boolean} is_crit
 * @returns {void}
 */
export function play_shot(is_hit, is_crit) {
	play_buffer(
		is_hit
			? is_crit
				? crit_sound
				: hit_sound
			: miss_sound
	)
}
/**
 * @param {boolean} visible
 * @returns {void}
 */
export function set_audio_visible(visible) {
	audio_visible = visible
	update_sfx_volume(get_audio_time())
}
/**
 * @param {number} t
 * @returns {void}
 */
function update_sfx_volume(t) {
	const volume = audio_visible
		? state.audio.sfx_volume / 100 * constants.audio.sfx_max_gain
		: 0
	if (abs(master.gain.value - volume) > EPS) {
		master.gain.cancelScheduledValues(t)
		master.gain.setValueAtTime(volume, t)
	}
}
/**
 * @param {number} t
 * @returns {void}
 */
function wake_audio(t) {
	if (context.state != "running") {
		context.resume()
	}
	update_sfx_volume(t)
}
{
	const curve = new Float32Array(4_097)
	for (let i = 0; i < curve.length; i++) {
		const x = (i / 2_048 - 1) * 4
		const x_abs = abs(x)
		curve[i] = x_abs <= .8
			? x
			: (x < 0 ? -1 : 1) * (.8 + .2 * tanh((x_abs - .8) / .2))
	}
	limiter.curve = curve
	limiter_input.gain.value = .25
	master.gain.value = 0
	master.connect(limiter_input)
		.connect(limiter)
		.connect(context.destination)
	sound_buffers.then(
		([ crit, hit, miss ]) => {
			crit_sound = crit
			hit_sound = hit
			miss_sound = miss
		}
	)
}