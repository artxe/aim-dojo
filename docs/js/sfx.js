import constants from "./constants.js"
import {
	abs,
	ceil,
	EPS,
	max,
	min,
	random,
	round,
	tanh
} from "./math.js"
const context = new AudioContext()
const master = context.createGain()
master.gain.value = 0
master.connect(context.destination)
const [ crit_sound, hit_sound ] = await Promise.all(
	[
		(() => {
			const sr = context.sampleRate
			const duration = .25
			const off = new OfflineAudioContext(1, ceil(sr * duration), sr)
			const t0 = 0
			const highpass = off.createBiquadFilter()
			highpass.type = "highpass"
			highpass.frequency.value = 700
			const air = off.createBiquadFilter()
			air.type = "peaking"
			air.frequency.value = 6_000
			air.Q.value = 1
			air.gain.value = 6
			const shaper = off.createWaveShaper()
			const shaper_curve = new Float32Array(256)
			for (let i = 0; i < 256; i++) {
				const x = i / 128 - 1
				shaper_curve[i] = tanh(2 * x)
			}
			shaper.curve = shaper_curve
			shaper.oversample = "2x"
			const mix = off.createGain()
			mix.gain.value = 1
			mix.connect(highpass)
			highpass.connect(air)
			air.connect(shaper)
			shaper.connect(off.destination)
			const base_hz = 1_600
			const ratio_list = [ 1, 2.41, 3.01, 3.77 ]
			const gain_list = [ .18, .12, .08, .06 ]
			const total_s = .18
			const bell_env = off.createGain()
			bell_env.gain.setValueAtTime(0, t0)
			bell_env.gain.linearRampToValueAtTime(.65, t0 + .002)
			bell_env.gain.exponentialRampToValueAtTime(.000_1, t0 + total_s)
			bell_env.connect(mix)
			for (let i = 0; i < ratio_list.length; i++) {
				const osc = off.createOscillator()
				osc.type = "sine"
				osc.frequency.setValueAtTime(base_hz * ratio_list[i], t0)
				const g = off.createGain()
				g.gain.value = gain_list[i]
				g.gain.exponentialRampToValueAtTime(
					.000_1,
					t0 + (total_s - .02) + i * .01
				)
				osc.connect(g)
				g.connect(bell_env)
				osc.start(t0)
				osc.stop(t0 + total_s + .04)
			}
			const click_len = .026
			const click_sharp = .9
			const click_body_amt = .14
			const click_bandpass_freq = 4_800
			const click_q_factor = 2 + click_sharp * .8
			const click_body_freq = 1_500
			const click_gain_mul = .25
			const noise_frames = round(sr * min(.05, click_len))
			const noise_buf = off.createBuffer(1, noise_frames, sr)
			const ch = noise_buf.getChannelData(0)
			for (let i = 0; i < noise_frames; i++) {
				const fade = 1 - i / noise_frames
				ch[i] = (random() * 2 - 1) * fade
			}
			const noise = off.createBufferSource()
			noise.buffer = noise_buf
			const click_highpass = off.createBiquadFilter()
			click_highpass.type = "highpass"
			click_highpass.frequency.value = 250 + click_sharp * 700
			const click_bandpass = off.createBiquadFilter()
			click_bandpass.type = "bandpass"
			click_bandpass.frequency.value = click_bandpass_freq
			click_bandpass.Q.value = click_q_factor
			const pulse = off.createOscillator()
			pulse.type = "square"
			pulse.frequency.value = 2_000 + click_sharp * 4_200
			const pulse_gain = off.createGain()
			pulse_gain.gain.value = (.002 + click_sharp * .010) * click_gain_mul
			const body = off.createOscillator()
			body.type = "sine"
			body.frequency.value = click_body_freq
			const body_gain = off.createGain()
			body_gain.gain.value = .02 * click_body_amt * click_gain_mul
			const click_env = off.createGain()
			click_env.gain.setValueAtTime(1, t0)
			click_env.gain.exponentialRampToValueAtTime(.001, t0 + max(.018, click_len))
			click_env.connect(mix)
			noise.connect(click_highpass)
				.connect(click_bandpass)
				.connect(click_env)
			pulse.connect(pulse_gain)
				.connect(click_env)
			body.connect(body_gain)
				.connect(click_env)
			noise.start(t0)
			noise.stop(t0 + min(.05, click_len))
			pulse.start(t0)
			pulse.stop(t0 + .02 + click_sharp * .02)
			body.start(t0)
			body.stop(t0 + click_len * 1.1)
			return off.startRendering()
		})(),
		(() => {
			const sr = context.sampleRate
			const duration = .08
			const off = new OfflineAudioContext(1, ceil(sr * duration), sr)
			const t0 = 0
			const len = .035
			const sharp = .8
			const body_amt = .55
			const bp_freq = 1_400
			const q_factor = .8 + sharp * 1.5
			const body_freq = 320
			const noise_len = round(sr * .03)
			const noise_buf = off.createBuffer(1, noise_len, sr)
			const ch = noise_buf.getChannelData(0)
			for (let i = 0; i < noise_len; i++) {
				ch[i] = (random() * 2 - 1) * (1 - i / noise_len)
			}
			const noise = off.createBufferSource()
			noise.buffer = noise_buf
			const pulse = off.createOscillator()
			pulse.type = "square"
			pulse.frequency.value = 2_000 + sharp * 4_000
			const pulse_gain = off.createGain()
			pulse_gain.gain.value = (.002 + sharp * .01)
			const body = off.createOscillator()
			body.type = "sine"
			body.frequency.value = body_freq
			const body_gain = off.createGain()
			body_gain.gain.value = .02 * body_amt
			const highpass = off.createBiquadFilter()
			highpass.type = "highpass"
			highpass.frequency.value = 250 + sharp * 600
			const bandpass = off.createBiquadFilter()
			bandpass.type = "bandpass"
			bandpass.frequency.value = bp_freq
			bandpass.Q.value = q_factor
			const env = off.createGain()
			env.gain.setValueAtTime(1, t0)
			env.gain.exponentialRampToValueAtTime(.001, t0 + max(.02, len))
			const shaper = off.createWaveShaper()
			const curve = new Float32Array(256)
			for (let i = 0; i < 256; i++) {
				const x = i / 128 - 1
				curve[i] = tanh(2.2 * x)
			}
			shaper.curve = curve
			shaper.oversample = "2x"
			noise.connect(highpass)
				.connect(bandpass)
				.connect(env)
			pulse.connect(pulse_gain)
				.connect(env)
			body.connect(body_gain)
				.connect(env)
			env.connect(shaper)
				.connect(off.destination)
			noise.start(t0)
			noise.stop(t0 + min(.06, len))
			pulse.start(t0)
			pulse.stop(t0 + .02 + sharp * .02)
			body.start(t0)
			body.stop(t0 + len * 1.2)
			return off.startRendering()
		})()
	]
)
/** @returns {number} */
export function now() {
	return context.currentTime
}
/** @returns {void} */
export function play_crit() {
	const t = now()
	wake(t)
	const src = context.createBufferSource()
	src.buffer = crit_sound
	src.connect(master)
	src.start(t)
}
/** @returns {void} */
export function play_hit() {
	const t = now()
	wake(t)
	const src = context.createBufferSource()
	src.buffer = hit_sound
	src.connect(master)
	src.start(t)
}
/**
 * @param {number} t
 * @returns {void}
 */
function wake(t) {
	const { volume } = constants.audio
	if (context.state !== "running") {
		context.resume()
	}
	if (abs(master.gain.value - volume) > EPS) {
		master.gain.cancelScheduledValues(t)
		master.gain.setTargetAtTime(volume, t, .01)
	}
}