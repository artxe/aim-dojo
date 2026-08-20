import game_mode from "../game_mode/index.js"
import { lang_text } from "../i18n.js"
import { clamp, max, min } from "../math.js"
import state from "../state.js"
import {
	accuracy_el,
	aim_booster_btn,
	al_ads_scope_select,
	al_el,
	bdo_el,
	crit_rate_el,
	cs2_ads_scope_select,
	cs2_el,
	flick_180_btn,
	flick_btn,
	fn_ads_scope_select,
	fn_el,
	fov_el,
	game_sens_list_el,
	h_tracking_btn,
	hud_score_el,
	hud_status_el,
	lol_el,
	lol_sens_input,
	mc_el,
	mc_file_el,
	menu_el,
	monitor_el,
	ow_ads_scope_select,
	ow_el,
	peak_score_el,
	pubg_ads_scope_select,
	pubg_el,
	pubg_file_el,
	pubg_fov_select,
	r6_ads_scope_select,
	r6_el,
	r6_file_el,
	rb_ads_scope_select,
	rb_el,
	sa_el,
	sens_error_el,
	set_attr_if_changed,
	set_text_if_changed,
	setting_audio_el,
	setting_background_el,
	setting_btn,
	setting_clear_score_el,
	setting_control_el,
	setting_cpi_normalizer_el,
	setting_crosshair_el,
	setting_equalizer_apo_el,
	setting_language_el,
	setting_view_el,
	timer_el,
	timing_btn,
	tutorial_btn,
	tutorial_keys_el,
	tutorial_next_btn,
	tutorial_prev_btn,
	tutorial_progress_el,
	tutorial_shade_el,
	tutorial_skip_btn,
	tutorial_spotlight_el,
	tutorial_text_el,
	tutorial_tip_el,
	tutorial_view_el,
	twitch_btn,
	v_tracking_btn,
	val_ads_scope_select,
	val_el,
	writing_btn
} from "./dom.js"
import {
	close_game_sens_list,
	set_active_game_sens
} from "./game_sens.js"
import {
	close_setting_view,
	open_setting_view
} from "./setting.js"
const DONE_LABEL = { en: "Done", ko: "완료" }
const FIRE_HOLD = { en: "Hold", ko: "누른 채 사격" }
const FIRE_TAP = { en: "Tap", ko: "탭 사격" }
const GAP = 12
const HUD_BLANK = "-"
const HUD_PREVIEW = {
	accuracy: "86.67%",
	crit_rate: "34.62%",
	fov: "fpp 103°",
	peak_score: "3033 / 3480",
	sens_error: "error +0.12%",
	timer: "240 / 01:12"
}
const NEXT_LABEL = { en: "Next", ko: "다음" }
const NO_KEYS = { en: "", ko: "" }
const PAD = 8
const PREV_LABEL = { en: "Prev", ko: "이전" }
const SKIP_LABEL = { en: "Exit", ko: "닫기" }
/**
 * @type {Record<
 *	GameSensName,
 *	{ el: HTMLLIElement, extras?: { el: HTMLElement, text: LangText }[], text: LangText }
 * >}
 */
const sens_cards = {
	al: {
		el: al_el,
		extras: [
			{
				el: al_ads_scope_select,
				text: {
					en: `APEX LEGENDS —
Trainer ADS picks the ADS FOV a run uses.
Note that in Apex the x1 scope is narrower than hipfire.`,
					ko: `APEX LEGENDS —
훈련 모드에서 사용할 ADS 시야각은 Trainer ADS에서 선택할 수 있습니다.
참고로 에이펙스의 1배율은 힙파이어보다 시야각이 좁아집니다.`
				}
			}
		],
		text: {
			en: `APEX LEGENDS —
Apex lets you set a separate sensitivity per magnification in game.
Its FOV slider is a little odd: 110 on the slider is really 108.5° on a 4:3 basis.`,
			ko: `APEX LEGENDS —
에이펙스는 인게임에서 배율별로 감도를 따로 설정할 수 있습니다.
에이펙스의 FOV 슬라이더는 조금 특이하게 동작하는데, 슬라이더를 110으로 설정하면 실제로는 화면비 4:3 기준 108.5°가 됩니다.`
		}
	},
	bdo: {
		el: bdo_el,
		text: {
			en: `Black Desert —
Black Desert applies mouse sensitivity against its maximum FOV.
But its FOV approaches the minimum FOV as the camera distance shortens, so the turn feels faster.`,
			ko: `Black Desert —
검은사막은 최대 시야각을 기준으로 마우스 감도를 적용합니다.
하지만 검은사막의 시야각은 카메라 거리가 짧아질수록 최소 시야각에 가까워지기 때문에 체감 회전 속도가 더 빠르게 느껴집니다.`
		}
	},
	cs2: {
		el: cs2_el,
		extras: [
			{
				el: cs2_ads_scope_select,
				text: {
					en: `Counter-Strike 2 —
Trainer ADS picks the ADS FOV a run uses.
Turn ADS Toggle on in Settings and a run can reach the second zoom stage too.`,
					ko: `Counter-Strike 2 —
훈련 모드에서 사용할 ADS 시야각은 Trainer ADS에서 선택할 수 있습니다.
설정에서 ADS Toggle을 켜면 훈련 모드에서도 2단 줌을 쓸 수 있습니다.`
				}
			}
		],
		text: {
			en: `Counter-Strike 2 —
CS2 has three zoom FOVs but only one zoom sensitivity field.
The second stage sees only limited use, for long range or narrow gaps, so it is better to set your sensitivity against the AWP's first stage.
A run matches that one field the same way, so the AUG's wider zoom runs slow and a second stage runs fast, exactly as they do in game.`,
			ko: `Counter-Strike 2 —
카스2에는 3종류의 줌 시야각이 있지만 줌 감도 설정은 하나뿐입니다.
2단 줌은 장거리나 좁은 틈새를 노릴 때 제한적으로 사용하기 때문에 기본적으로 AWP 1단 줌을 기준으로 감도를 설정하는 것이 좋습니다.
훈련 모드에서도 그 감도 하나를 동일한 기준으로 맞추기 때문에, AUG의 넓은 줌은 느리게, 2단 줌은 빠르게 동작하며 이는 인게임과 같습니다.`
		}
	},
	fn: {
		el: fn_el,
		extras: [
			{
				el: fn_ads_scope_select,
				text: {
					en: `Fortnite —
Trainer ADS picks the ADS FOV a run uses.
In Fortnite a gun with no scope stays in third person even while aiming, so leaving Trainer ADS on an ADS option runs the trainer in third person too.`,
					ko: `Fortnite —
훈련 모드에서 사용할 ADS 시야각은 Trainer ADS에서 선택할 수 있습니다.
포트나이트에서 조준경이 없는 총은 조준해도 3인칭 시점이 유지되기 때문에, Trainer ADS를 ADS로 두면 훈련 모드에서도 3인칭이 적용됩니다.`
				}
			}
		],
		text: {
			en: `Fortnite —
Fortnite has far too many per-weapon FOVs for its two sensitivity fields to cover.
Set Zoom Scaling to Standard instead: the turn slows in proportion to the projection scale, which at least reduces the average error between the recommended sensitivity and the in-game zoom sensitivity.`,
			ko: `Fortnite —
포트나이트는 조준사격 감도와 조준경 감도 두 개로 커버하기에는 무기별 시야각이 너무 다양합니다.
대신 Zoom Scaling 옵션을 Standard로 설정하면 투영 배율에 비례해서 카메라 회전 속도가 느려지기 때문에, 그나마 추천 감도 대비 인게임 줌 감도의 평균 오차를 줄일 수 있습니다.`
		}
	},
	lol: {
		el: lol_el,
		extras: [
			{
				el: lol_sens_input,
				text: {
					en: `League of Legends —
Move League's sensitivity away from 50 and every other game's recommended sensitivity rises or falls with it, scaled by that notch's CPI multiplier.
But some older games — Black Desert among them — do not use raw input and apply the Windows mouse settings to the turn speed, so changing League's sensitivity does not change their recommendation.`,
					ko: `League of Legends —
만약 롤 감도를 50이 아닌 다른 값으로 변경하면 해당 감도의 CPI 배율에 따라 다른 게임의 추천 감도 또한 높아지거나 낮아지게 됩니다.
하지만 검은사막과 같은 몇몇 오래된 게임은 raw input을 사용하지 않고 카메라 회전 속도에 윈도우 마우스 설정이 적용되기 때문에, 롤 감도를 변경하더라도 추천 감도가 바뀌지 않습니다.`
				}
			}
		],
		text: {
			en: `League of Legends —
League's slider sets mouse speed in steps of 5, but it works by changing your Windows mouse settings.
League's 50 is the value where the cursor moves one pixel per count, so keep it at 50 and find your sensitivity by adjusting mouse CPI instead.
Enhance pointer precision in the Windows mouse settings also has to be off, or you cannot match sensitivity with a game that reads raw input.`,
			ko: `League of Legends —
롤에서는 감도 슬라이더를 통해 5단위로 마우스 속도를 설정할 수 있지만, 이는 윈도우 마우스 설정을 바꾸는 방식으로 동작합니다.
롤 감도 50이 마우스 커서가 1카운트당 1픽셀 이동하는 값이기 때문에, 기본적으로 롤 감도는 50으로 고정하고 마우스 CPI를 조절해서 자신에게 맞는 감도를 찾는 것을 추천합니다.
또한 윈도우 마우스 설정의 포인터 정확도 향상 옵션이 켜져 있으면 raw input을 사용하는 게임과 감도를 맞출 수 없기 때문에 반드시 꺼야 합니다.`
		}
	},
	mc: {
		el: mc_el,
		extras: [
			{
				el: mc_file_el,
				text: {
					en: `Minecraft —
Clicking the Drop file for update box copies Minecraft's settings folder and opens a file picker.
Paste the path into Explorer's address bar and pick options.txt, and a copy with the FOV options and the mouse sensitivity corrected downloads.`,
					ko: `Minecraft —
Drop file for update 상자를 클릭하면 마인크래프트 설정 파일의 위치가 복사되며 파일 탐색기가 열립니다.
복사된 경로를 파일 탐색기의 주소창에 붙여넣고 options.txt 파일을 찾아 선택하면, 시야각 관련 옵션과 마우스 감도가 수정된 파일이 다운로드됩니다.`
				}
			}
		],
		text: {
			en: `Minecraft —
Minecraft's slider looks like it sets mouse speed in 1 % steps, but it really has 142 notches rather than 200, so it moves in steps of about 1.41 % and the precision is poor.
But editing Minecraft's options.txt directly lets you set the exact sensitivity.`,
			ko: `Minecraft —
마인크래프트에서는 감도 슬라이더를 통해 1% 단위로 마우스 속도를 설정할 수 있는 것처럼 보이지만, 실제로는 200칸이 아니라 142칸이라 약 1.41% 단위로 설정되기 때문에 정밀도가 낮습니다.
하지만 마인크래프트의 options.txt 파일을 직접 수정하면 정확한 감도로 설정할 수 있습니다.`
		}
	},
	ow: {
		el: ow_el,
		extras: [
			{
				el: ow_ads_scope_select,
				text: {
					en: `Overwatch —
Trainer ADS picks the ADS FOV a run uses.
Overwatch uses a horizontal FOV, but a hero's scoped FOV is a vertical one.`,
					ko: `Overwatch —
훈련 모드에서 사용할 ADS 시야각은 Trainer ADS에서 선택할 수 있습니다.
오버워치는 수평 시야각을 사용하지만, 영웅별 줌 시야각은 수직 시야각을 사용합니다.`
				}
			}
		],
		text: {
			en: `Overwatch —
Overwatch lets you set a separate zoom sensitivity per hero in game.
Some pros set projectile heroes, or heroes like Genji and Tracer, faster than their hitscan heroes, but it is not recommended.`,
			ko: `Overwatch —
오버워치는 인게임에서 영웅별로 줌 감도를 따로 설정할 수 있습니다.
투사체 영웅이나 겐지·트레이서 같은 영웅의 감도를 히트스캔 영웅보다 빠르게 설정하는 프로도 있지만, 이는 권장되지 않습니다.`
		}
	},
	pubg: {
		el: pubg_el,
		extras: [
			{
				el: pubg_fov_select,
				text: {
					en: `PUBG: BATTLEGROUNDS —
Whether the card is read on a first-person or a third-person basis is picked here, and the FOV you pick is written into the config file as well.
For first-person players 103 is recommended, the widest view there is; for third-person players 80, which keeps the sensitivity the same when the view switches.`,
					ko: `PUBG: BATTLEGROUNDS —
카드를 1인칭 기준으로 볼지 3인칭 기준으로 볼지는 여기서 선택할 수 있으며, 여기서 고른 시야각이 설정 파일에도 그대로 기록됩니다.
1인칭 유저의 경우 가장 넓은 시야를 얻을 수 있는 103을, 3인칭 유저의 경우 시점 전환 시에도 동일한 감도를 유지할 수 있는 80을 추천합니다.`
				}
			},
			{
				el: pubg_ads_scope_select,
				text: {
					en: `PUBG: BATTLEGROUNDS —
Trainer ADS picks the ADS FOV a run uses.
Note that PUBG's 15x scope actually works at 12x at most.`,
					ko: `PUBG: BATTLEGROUNDS —
훈련 모드에서 사용할 ADS 시야각은 Trainer ADS에서 선택할 수 있습니다.
참고로 배그의 15배율 스코프는 실제로는 최대 12배율로 동작합니다.`
				}
			},
			{
				el: pubg_file_el,
				text: {
					en: `PUBG: BATTLEGROUNDS —
Clicking the Drop file for update box copies PUBG's settings folder and opens a file picker.
Paste the path into Explorer's address bar and pick GameUserSettings.ini, and a copy with the FOV options and the mouse sensitivities corrected downloads.`,
					ko: `PUBG: BATTLEGROUNDS —
Drop file for update 상자를 클릭하면 배그 설정 파일의 위치가 복사되며 파일 탐색기가 열립니다.
복사된 경로를 파일 탐색기의 주소창에 붙여넣고 GameUserSettings.ini 파일을 찾아 선택하면, 시야각 관련 옵션과 마우스 감도가 수정된 파일이 다운로드됩니다.`
				}
			}
		],
		text: {
			en: `PUBG: BATTLEGROUNDS —
PUBG offers per-scope sensitivity settings, but in game they can only be set in whole numbers, so the precision is poor.
The in-game sensitivity is converted into an internal value called LastConvertedSensitivity and stored to six decimal places, so editing GameUserSettings.ini directly lets you set the exact sensitivity.`,
			ko: `PUBG: BATTLEGROUNDS —
배그는 배율별 감도 설정을 제공하지만 인게임에서는 정수 단위로만 설정할 수 있기 때문에 정밀도가 낮습니다.
인게임 감도는 LastConvertedSensitivity라는 내부 값으로 변환되어 소수점 아래 여섯 자리까지 저장되기 때문에, GameUserSettings.ini 파일을 직접 수정하면 정확한 감도로 설정할 수 있습니다.`
		}
	},
	r6: {
		el: r6_el,
		extras: [
			{
				el: r6_ads_scope_select,
				text: {
					en: `RAINBOW 6 —
Trainer ADS picks the ADS FOV a run uses.`,
					ko: `RAINBOW 6 —
훈련 모드에서 사용할 ADS 시야각은 Trainer ADS에서 선택할 수 있습니다.`
				}
			},
			{
				el: r6_file_el,
				text: {
					en: `RAINBOW 6 —
Clicking the Drop file for update box copies Rainbow 6's settings folder and opens a file picker.
Paste the path into Explorer's address bar, open the profile id folder inside it — a UUID — and pick GameSettings.ini, and a copy with the FOV options and the mouse sensitivities corrected downloads.
That copy also rewrites the sensitivity coefficient, ADSMouseMultiplierUnit, so the scope values can land more precisely.`,
					ko: `RAINBOW 6 —
Drop file for update 상자를 클릭하면 레인보우 식스 설정 파일의 위치가 복사되며 파일 탐색기가 열립니다.
복사된 경로를 파일 탐색기의 주소창에 붙여넣고 UUID 형식의 프로필 ID 폴더를 연 뒤 GameSettings.ini 파일을 찾아 선택하면, 시야각 관련 옵션과 마우스 감도가 수정된 파일이 다운로드됩니다.
이때 다운로드되는 파일은 더 정밀한 감도 설정을 위해 감도 계수인 ADSMouseMultiplierUnit도 함께 수정됩니다.`
				}
			}
		],
		text: {
			en: `RAINBOW 6 —
Rainbow 6 does let you set a sensitivity per scope in game, but only in whole numbers, so the precision is poor.
But editing Rainbow 6's GameSettings.ini directly lets you adjust ADSMouseMultiplierUnit and set the exact sensitivity at every magnification.`,
			ko: `RAINBOW 6 —
레인보우 식스는 인게임에서 배율별 감도 설정이 가능하지만 정수 단위로밖에 설정할 수 없어서 정밀도가 낮습니다.
하지만 레인보우 식스의 GameSettings.ini 파일을 직접 수정하면 ADSMouseMultiplierUnit을 조절하면서 모든 배율에서 정확한 감도로 설정할 수 있습니다.`
		}
	},
	rb: {
		el: rb_el,
		extras: [
			{
				el: rb_ads_scope_select,
				text: {
					en: `Roblox —
Trainer ADS picks the ADS FOV a run uses.
Rivals shares one aiming sensitivity across every weapon, so the card takes the 5 % step with the least error at 45°, the FOV of its meta weapons, the Assault Rifle and the Sniper Rifle.
A run uses that number as it stands whatever you pick here, so it carries the same error that one field leaves you in game.`,
					ko: `Roblox —
훈련 모드에서 사용할 ADS 시야각은 Trainer ADS에서 선택할 수 있습니다.
라이벌즈는 모든 무기가 조준 감도 하나를 공유하기 때문에, 카드는 메타 무기인 돌격 소총과 저격 소총의 시야각 45°에서 오차가 가장 작은 5% 단위 값을 사용합니다.
훈련 모드는 여기서 어떤 무기를 고르든 그 값을 그대로 쓰기 때문에, 인게임에서 그 감도 하나가 남기는 오차를 똑같이 받게 됩니다.`
				}
			}
		],
		text: {
			en: `Roblox —
Roblox is a platform you play many games on, and its own mouse sensitivity is tuned to a 70° vertical FOV.
Rivals is the most played shooter on it, and its in-game sensitivity is multiplied by the Roblox one, so raise the FOV to the maximum and raise the in-game sensitivity to match.
Setting the FOV effect to 0 % keeps the hipfire FOV while aiming, but precise aim wants a narrower view, so 100 % is recommended.`,
			ko: `Roblox —
로블록스는 여러 가지 게임을 즐길 수 있는 플랫폼으로서, 기본 마우스 감도는 수직 시야각 70°에 맞춰져 있습니다.
라이벌즈는 로블록스에서 가장 인기 있는 FPS 게임이며 인게임 감도에 로블록스 감도가 곱해지기 때문에, 시야각을 최대로 올리고 그에 맞춰 인게임 감도를 올리는 것을 추천합니다.
시야 효과의 강도를 0%로 설정하면 조준할 때도 힙파이어와 동일한 시야각으로 플레이할 수 있지만, 정밀한 조준을 위해서는 시야각이 좁은 편이 낫기 때문에 시야 효과는 100%를 추천합니다.`
		}
	},
	sa: {
		el: sa_el,
		text: {
			en: `Sudden Attack —
Sudden Attack is one of the most played FPS games in Korea. Setting the aspect ratio to 4:3 crops both sides of the screen, but AIM DOJO's trainer ignores that.
It has a fair number of sniper rifles, but the game has no zoom sensitivity option anyway, so AIM DOJO's trainer covers only the TRG, the most picked one.
Its zoom FOV and its turn speed are completely unrelated, so match the hipfire sensitivity and play around quickscopes and held angles.`,
			ko: `Sudden Attack —
서든어택은 대한민국에서 가장 인기 있는 FPS 게임 중 하나로서, 화면비를 4:3으로 설정하면 화면의 양옆이 잘리지만 AIM DOJO의 훈련 모드에서는 이를 무시합니다.
나름 여러 종류의 저격소총이 있지만 어차피 줌 감도 설정 옵션이 없는 게임이기 때문에, AIM DOJO의 훈련 모드에서는 픽률이 가장 높은 TRG만 다루고 있습니다.
서든어택의 줌 시야각과 카메라 회전 속도는 완전히 따로 놀기 때문에, 힙파이어 감도를 맞춰 놓고 패줌이나 대기 위주로 플레이하는 것을 추천합니다.`
		}
	},
	val: {
		el: val_el,
		extras: [
			{
				el: val_ads_scope_select,
				text: {
					en: `VALORANT —
Trainer ADS picks the ADS FOV a run uses.
With ADS Toggle off in Settings, even the Operator stops at its first zoom stage.
A run types the same two fields you do, ADS matched to the Vandal and Scoped to the Operator, so picking any other weapon here trains at the error that one field really leaves you.`,
					ko: `VALORANT —
훈련 모드에서 사용할 ADS 시야각은 Trainer ADS에서 선택할 수 있습니다.
설정에서 ADS Toggle이 꺼져 있으면 오퍼레이터도 1단 줌까지만 동작합니다.
훈련 모드에서도 인게임과 똑같이 조준사격은 밴달, 조준경은 오퍼레이터 기준으로 맞춘 감도를 사용하기 때문에, 다른 무기를 고르면 그 감도가 실제로 남기는 오차까지 그대로 훈련하게 됩니다.`
				}
			}
		],
		text: {
			en: `VALORANT —
Valorant has far too many per-weapon FOVs for its two sensitivity fields to cover.
But the Vandal and the Phantom take an overwhelming share of picks, and among the snipers the Operator is picked more than the other two combined, so setting ADS against x1.25 and Scoped against x2.5 is recommended.`,
			ko: `VALORANT —
발로란트는 조준사격 감도와 조준경 감도 두 개로 커버하기에는 무기별 시야각이 너무 다양합니다.
하지만 밴달과 팬텀이 압도적인 픽률을 차지하며 저격소총 중에서는 오퍼레이터의 픽률이 나머지 둘을 합친 것보다 높기 때문에, 조준사격은 1.25x, 조준경은 2.5x 기준으로 설정하는 것을 추천합니다.`
		}
	}
}
const sens_games = /** @type {GameSensName[]} */(Object.keys(sens_cards))/**/
/** @type {TutorialStep[]} */
const steps = [
	{
		el: menu_el,
		keys: {
			en: `${NEXT_LABEL.en} / ${PREV_LABEL.en} · ← → · Esc: ${SKIP_LABEL.en}`,
			ko: `${NEXT_LABEL.ko} / ${PREV_LABEL.ko} · ← → · Esc: ${SKIP_LABEL.ko}`
		},
		text: {
			en: `AIM DOJO is an aim trainer built on one sensitivity model — one that covers first- and third-person shooters, Minecraft and Roblox, and even a game like League of Legends that follows your Windows mouse settings — with training modes that move between 2D and 3D.
This tour covers what is on screen, how the controls work, and every settings section.`,
			ko: `AIM DOJO는 1인칭·3인칭 FPS 게임이나 마인크래프트와 로블록스뿐만 아니라 윈도우 마우스 설정을 따르는 롤 같은 게임까지 통일하는 감도 계산식과, 2D와 3D를 넘나드는 여러 가지 훈련 모드를 제공하는 에임 트레이너입니다.
이 튜토리얼에서는 AIM DOJO의 화면 구성과 조작법, 그리고 모든 설정 항목을 알아보겠습니다.`
		}
	},
	{
		el: monitor_el,
		keys: NO_KEYS,
		text: {
			en: `To put every game on one sensitivity, AIM DOJO derives its recommended sensitivities from your monitor resolution and each game's FOV.
Editing the resolution here recomputes every card below, and starting a run resets it to this monitor's real resolution.`,
			ko: `AIM DOJO는 여러 게임의 감도를 통일하기 위해 모니터 해상도와 게임별 시야각에 따른 추천 감도를 제공합니다.
여기서 설정한 해상도에 따라 아래 카드의 추천 감도가 바뀌지만, 훈련 모드를 시작하면 이 값은 현재 모니터의 실제 해상도로 갱신됩니다.`
		}
	},
	{
		el: game_sens_list_el,
		keys: NO_KEYS,
		text: {
			en: `The recommended sensitivity for each game is shown here.
Click the game's name to unfold the list, and picking a game from it applies that game's FOV and recommended sensitivity to the trainer as well.`,
			ko: `게임별 추천 감도는 여기에 표시됩니다.
여기서 게임 이름을 클릭하면 게임 목록이 펼쳐지고, 목록에서 원하는 게임을 선택하면 훈련 모드에도 해당 게임의 시야각과 추천 감도가 적용됩니다.`
		}
	},
	...sens_games.flatMap(sens_step),
	{
		el: aim_booster_btn,
		keys: mode_keys("aim_booster", FIRE_TAP),
		text: {
			en: `Aim Booster —
Inspired by aimbooster.com: two targets spawn per second, and the rate climbs by another two per second every minute.
Let the backlog build up because you cannot clear them fast enough and every target left on screen disappears while the spawn rate rewinds 10 seconds.
It runs only in 2D whatever the FOV, and it is a good warm-up mode as well.
The mouse CPI that scores highest in this drill is your one true sensitivity.`,
			ko: `Aim Booster —
aimbooster.com에서 영감을 받은 모드로 초당 2개의 표적이 생성되며, 매 분마다 초당 표적이 2개꼴로 늘어납니다.
표적 처리 속도가 느려서 표적이 너무 많이 쌓이면 화면에 남아있는 표적이 모두 사라지며 표적 생성 속도가 10초 전으로 되돌아갑니다.
시야각에 상관없이 2D로만 동작하며 손풀기용으로도 적절한 모드입니다.
이 훈련에서 가장 높은 점수를 달성할 수 있는 마우스 CPI가 당신의 인생 감도입니다.`
		}
	},
	{
		el: flick_btn,
		keys: mode_keys("flick", FIRE_TAP),
		text: {
			en: `Flick —
For building the ability to clear several enemies quickly.
Only the nearest target is active, and to stop no-look drag shots a target shows its exact position and weak point only once your aim is next to it.`,
			ko: `Flick —
여러 명의 적을 빠르게 처리하는 능력을 키우기 위한 모드입니다.
가장 가까운 표적만이 활성화되며 노룩 끌어치기를 방지하기 위해 에임이 표적에 인접해야만 표적의 위치와 약점이 정확히 표시됩니다.`
		}
	},
	{
		el: flick_180_btn,
		keys: mode_keys("flick_180", FIRE_TAP),
		text: {
			en: `Flick 180° —
For practising the 180° turn, which lands differently in every game because the FOV does; random flicks and 180° flicks alternate.
Turnarounds and distance judgement on heroes like Overwatch's Genji or Tracer are separate from raw aim, though — playing those heroes in the game itself helps far more than training them here.`,
			ko: `Flick 180° —
시야각에 따라 게임별로 달라지는 180도 턴을 연습하기 위한 모드이며 랜덤 플릭과 180도 플릭 패턴이 번갈아 나옵니다.
그러나 에임 실력과 별개로 오버워치의 겐지나 트레이서 같은 180도 화면 전환이나 거리 재기 기술을 숙련하는 것은 에임 트레이닝보다 실제로 인게임에서 해당 캐릭터를 플레이하는 것이 훨씬 더 큰 도움이 됩니다.`
		}
	},
	{
		el: v_tracking_btn,
		keys: mode_keys("v_tracking", FIRE_HOLD),
		text: {
			en: `V-Tracking —
For practising vertical tracking: the target moves up and down while its size and speed keep changing.
Enemies in a real game move mostly on the horizontal axis, so it is best used only to check whether your vertical sensitivity is right.`,
			ko: `V-Tracking —
수직 트래킹을 연습하기 위한 모드이며 표적의 크기와 속도가 계속 변하며 위아래로 움직입니다.
실제 게임에서 적들의 움직임은 대부분 좌우 축에서 발생하기 때문에 수직 감도가 적절한지 확인하는 용도로만 사용하시길 권합니다.`
		}
	},
	{
		el: timing_btn,
		keys: mode_keys("timing", FIRE_TAP),
		text: {
			en: `Timing —
For building the ability to snipe fast-moving enemies.
A target spawns at a random position, travels left or right for a second and disappears, and the earlier you fire the more you score.`,
			ko: `Timing —
빠르게 움직이는 적을 저격하는 능력을 키우기 위한 모드입니다.
표적이 랜덤한 위치에 생성되고 좌우 중 한 방향으로 1초간 이동하다가 사라지며, 빨리 쏠수록 더 높은 점수를 얻습니다.`
		}
	},
	{
		el: h_tracking_btn,
		keys: mode_keys("h_tracking", FIRE_HOLD),
		text: {
			en: `H-Tracking —
For practising horizontal tracking: the target moves left and right while its size and speed keep changing.
Enemies in a real game move mostly on this axis, which makes it a good warm-up as well.`,
			ko: `H-Tracking —
수평 트래킹을 연습하기 위한 모드이며 표적의 크기와 속도가 계속 변하며 좌우로 움직입니다.
실제 게임에서 적들의 움직임은 대부분 좌우 축에서 발생하기 때문에 손풀기용으로도 적절한 모드입니다.`
		}
	},
	{
		el: twitch_btn,
		keys: mode_keys("twitch", FIRE_TAP),
		text: {
			en: `Twitch —
For building the ability to deal quickly with an enemy that appears out of nowhere.
Targets spawn two at a time and disappear after a second, and clearing the first one gives another half second of grace before the next one goes.`,
			ko: `Twitch —
갑자기 나타난 적을 빠르게 처리하는 능력을 키우기 위한 모드입니다.
표적이 두 개씩 생성되며 1초 후에 사라지고, 첫 표적을 처리하면 다음 표적이 사라지기까지 0.5초의 유예 시간이 더 주어집니다.`
		}
	},
	{
		el: writing_btn,
		keys: mode_keys("writing", FIRE_HOLD),
		text: {
			en: `Writing —
A handwriting mode, drawn with the crosshair, for practising precise aim control.
A lower sensitivity than the one that peaks in Aim Booster scores far more easily here, but for real play it is worth practising Writing at the sensitivity Aim Booster settled on.`,
			ko: `Writing —
정밀한 에임 컨트롤을 연습하기 위해 크로스헤어로 글씨를 쓰는 모드입니다.
Writing 모드에서는 Aim Booster 모드에서 최고점이 나오는 감도보다 더 낮은 감도를 쓰는 게 높은 점수를 얻기 훨씬 쉽지만, 실전을 위해서는 Aim Booster 모드에 최적화된 감도로 Writing을 연습하는 걸 추천합니다.`
		}
	},
	{
		el: hud_score_el,
		keys: NO_KEYS,
		text: {
			en: `The top of the screen shows the current score, Accuracy and Critical during a run, and in Aim Booster the third one becomes Targets, the number of targets spawned per second.
The score is figured from the last 30 seconds, and the highest it reached after the run started is recorded as Peak, the number a run leaves behind as your best score.
The numbers shown here are an example.`,
			ko: `훈련 중 화면 위쪽에는 현재 점수와 적중률, 치명타율이 표시되며 Aim Booster에서는 세 번째 항목이 초당 표적 생성 개수인 Targets로 바뀝니다.
점수는 기본적으로 최근 30초를 기준으로 계산되며, 훈련을 시작한 뒤 가장 높았던 점수가 Peak로 기록되어 그대로 최고 점수가 됩니다.
지금 보이는 숫자는 예시입니다.`
		}
	},
	{
		el: hud_status_el,
		keys: NO_KEYS,
		text: {
			en: `The top right shows FPS and elapsed time, then the current view and FOV, then the error between the sensitivity you set in game and the recommended one.
A FOV the in-game sensitivity fields cannot cover inevitably reads a large error.`,
			ko: `오른쪽 위에는 FPS와 경과 시간, 현재 시점과 시야각, 그리고 인게임 설정 감도와 추천 감도의 오차가 표시됩니다.
인게임 감도 설정으로 추천 감도를 맞출 수 없는 시야각에서는 필연적으로 오차가 커집니다.`
		}
	},
	{
		el: setting_btn,
		keys: NO_KEYS,
		text: {
			en: `Setting opens, as the name says, the settings panel.
The tour walks its eight sections next.`,
			ko: `Setting을 누르면 말 그대로 설정 패널이 열립니다.
이제 8개의 설정 항목을 차례대로 살펴보겠습니다.`
		}
	},
	{
		el: setting_language_el,
		keys: NO_KEYS,
		text: {
			en: `Language —
Picks the language of the tour and the toast messages.
It follows your browser's language on a first visit, and you can change it here yourself.`,
			ko: `Language —
튜토리얼과 토스트 메시지의 언어를 선택합니다.
처음 방문하면 자동으로 브라우저 언어를 따르지만, 여기서 직접 바꿀 수 있습니다.`
		}
	},
	{
		el: setting_audio_el,
		keys: NO_KEYS,
		text: {
			en: `Audio —
SFX is the volume of the shot, hit and miss sound effects; BGM is the volume of the background video.
Browsers block autoplay, so the sound only starts after your first click or key press.`,
			ko: `Audio —
SFX는 사격·명중·빗나감 효과음의 음량이고, BGM은 배경 영상의 음량입니다.
브라우저의 자동 재생 정책 때문에 첫 클릭이나 키 입력이 있어야 소리가 재생됩니다.`
		}
	},
	{
		el: setting_background_el,
		keys: NO_KEYS,
		text: {
			en: `Background Video —
Upload a video of your own, switch to a YouTube one, or drop the background entirely to focus on the aim training.
Activate previews the background so a YouTube video can be started, its volume set and its looping turned on, and pressing Save applies the choice for real.
In-Game Blur blurs the background during a run so that it never gets in the way of picking out a target.`,
			ko: `Background Video —
배경 영상을 직접 업로드하거나, 유튜브 영상으로 바꾸거나, 에임 연습에 집중하기 위해 배경 영상을 없앨 수도 있습니다.
Activate는 유튜브 영상을 재생하거나, 볼륨을 조절하거나, 반복 재생을 설정할 수 있도록 배경을 미리 보는 기능이고, Save를 누르면 실제로 적용됩니다.
In-Game Blur를 켜면 표적을 식별하는 데 방해가 되지 않도록 훈련 중에 배경이 흐려집니다.`
		}
	},
	{
		el: setting_control_el,
		keys: NO_KEYS,
		text: {
			en: `Control —
ADS Toggle makes RMB switch the scope on and off instead of holding it, so it is best matched to whatever your game is set to.
Games that offer no hold option of their own, like Sudden Attack, always toggle regardless of this setting.`,
			ko: `Control —
ADS Toggle을 켜면 훈련 모드에서 ADS가 홀드가 아니라 토글로 동작하니, 실제 게임 설정과 똑같이 맞추는 것을 추천합니다.
서든어택처럼 게임 자체에 홀드 옵션이 없는 경우에는 이 설정과 상관없이 항상 토글로 동작합니다.`
		}
	},
	{
		el: setting_crosshair_el,
		keys: NO_KEYS,
		text: {
			en: `Crosshair —
The crosshair starts on the recommended values, and colour, opacity, width, height, thickness, gap and centre dot are drawn into the preview the moment you change one.
Reset puts every field back to its default.`,
			ko: `Crosshair —
크로스헤어는 기본적으로 추천값으로 설정되어 있으며, 색상·불투명도·너비·높이·두께·간격·중앙점을 바꾸는 즉시 미리보기에서 확인할 수 있습니다.
Reset을 누르면 모든 값이 기본값으로 돌아갑니다.`
		}
	},
	{
		el: setting_cpi_normalizer_el,
		keys: NO_KEYS,
		text: {
			en: `CPI Normalizer —
Enter the CPI, the game and the in-game sensitivity you play with now under From, and Result gives you the CPI that keeps that exact turn per inch once the in-game sensitivity moves to the recommended one.
Recommend's CPI-X and CPI-Y are the recommended pair, and the Y/X ratio it uses is the supergolden ratio (ψ).
Even if your mouse cannot set the two axes separately, RawAccel — linked right under it — applies that ratio per axis for you.
CPI-X can be edited by hand, and entering 0 puts it back to the default for your resolution.`,
			ko: `CPI Normalizer —
지금 쓰고 있는 CPI와 게임, 인게임 감도를 From에 입력하면 인게임 감도를 추천 감도로 바꿨을 때 지금과 동일한 감도를 유지하는 CPI가 Result에 표시됩니다.
Recommend에 표시되는 CPI-X와 CPI-Y가 추천 CPI이며, 추천하는 Y/X 비율은 초황금비(ψ)입니다.
사용 중인 마우스가 축별 CPI 설정을 지원하지 않더라도 아래에 링크된 RawAccel 프로그램을 사용하면 Y/X 비율로 축별 감도를 적용할 수 있습니다.
CPI-X는 직접 수정할 수 있으며, 0을 입력하면 해상도에 맞춘 기본값으로 돌아갑니다.`
		}
	},
	{
		el: setting_equalizer_apo_el,
		keys: NO_KEYS,
		text: {
			en: `Equalizer APO —
Equalizer APO is a program that lifts footsteps in the FPS games where listening for them decides the fight.
Install it, then press Copy Filter and paste the copied value straight in, and footsteps and voices come through more clearly.`,
			ko: `Equalizer APO —
Equalizer APO는 사플이 필요한 FPS 게임에서 발소리를 키울 수 있는 프로그램입니다.
프로그램을 설치한 뒤 Copy Filter로 복사한 값을 그대로 붙여넣으면 발소리나 음성을 더 선명하게 들을 수 있습니다.`
		}
	},
	{
		el: setting_clear_score_el,
		keys: NO_KEYS,
		text: {
			en: `Clear Score —
Best scores are kept per mode, and this is where you wipe them, one mode at a time.`,
			ko: `Clear Score —
모드별로 기록되는 최고 점수는 여기서 초기화할 수 있습니다.`
		}
	},
	{
		el: null,
		keys: {
			en: "Mouse: Aim · LMB / Q W E R A: Shoot · RMB: ADS or Shoot · Esc: Exit · Space (hold): 30 FPS limit",
			ko: "마우스: 조준 · 좌클릭 / Q W E R A: 사격 · 우클릭: ADS 또는 사격 · Esc: 나가기 · Space (누르고 있기): 30 FPS 제한"
		},
		text: {
			en: `That is the whole tour.
Pick a mode and start training.`,
			ko: `튜토리얼은 여기까지입니다.
원하는 모드를 골라 훈련을 시작해보세요.`
		}
	}
]
let step_index = 0
let tour_game = state.game.sens
{
	tutorial_btn.addEventListener("click", on_click_tutorial)
	tutorial_next_btn.addEventListener("click", () => step_tutorial(1))
	tutorial_prev_btn.addEventListener("click", () => step_tutorial(-1))
	tutorial_skip_btn.addEventListener("click", stop_tutorial)
	tutorial_view_el.addEventListener("click", on_click_shade)
}
/** @returns {boolean} */
export function is_tutorial_active() {
	return tutorial_view_el.hasAttribute("active")
}
/** @returns {void} */
export function layout_tutorial() {
	if (!is_tutorial_active()) {
		return
	}
	const { el } = steps[step_index]
	const shade_style = tutorial_shade_el.style
	const spotlight_style = tutorial_spotlight_el.style
	const tip_style = tutorial_tip_el.style
	if (el) {
		el.scrollIntoView({ block: "nearest" })
		const rect = el.getBoundingClientRect()
		const open_select = el.matches("x-select[open]")
			? el
			: el.querySelector("x-select[open]")
		const options = open_select?.querySelector(
			":scope > [data-select-options]"
		)
		const opts = options ? options.getBoundingClientRect() : rect
		const bottom = min(
			innerHeight,
			max(rect.bottom, opts.bottom) + PAD
		)
		const left = max(
			0,
			min(rect.left, opts.left) - PAD
		)
		const right = min(
			innerWidth,
			max(rect.right, opts.right) + PAD
		)
		const top = max(0, min(rect.top, opts.top) - PAD)
		tutorial_spotlight_el.removeAttribute("blank")
		shade_style.clipPath = `path(evenodd,"M0 0H${innerWidth}V${innerHeight}H0Z M${
			left} ${top}H${right}V${bottom}H${left}Z")`
		spotlight_style.height = `${bottom - top}px`
		spotlight_style.left = `${left}px`
		spotlight_style.top = `${top}px`
		spotlight_style.width = `${right - left}px`
		place_tip(left, top, right, bottom)
	} else {
		tutorial_spotlight_el.setAttribute("blank", "")
		shade_style.clipPath = "none"
		spotlight_style.height = "0"
		spotlight_style.left = "50%"
		spotlight_style.top = "50%"
		spotlight_style.width = "0"
		tip_style.left = `${(innerWidth - tutorial_tip_el.offsetWidth) / 2}px`
		tip_style.top = `${(innerHeight - tutorial_tip_el.offsetHeight) / 2}px`
	}
}
/**
 * @param {GameModeName} name
 * @param {LangText} fire
 * @returns {LangText}
 */
function mode_keys(name, fire) {
	const ads = game_mode[name].update_dimension
	return {
		en: `${fire.en} LMB / Q W E R A · RMB: ${ads ? "ADS" : "Shoot"} · Esc: Exit · Space (hold): 30 FPS limit`,
		ko: `좌클릭 / Q W E R A: ${fire.ko} · 우클릭: ${ads ? "ADS" : "사격"} · Esc: 나가기 · Space (누르고 있기): 30 FPS 제한`
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_click_shade(ev) {
	if (ev.target == tutorial_shade_el) {
		step_tutorial(1)
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_click_tutorial(ev) {
	const { rest_timeout } = state.game
	ev.preventDefault()
	if (rest_timeout > 0) {
		clearTimeout(rest_timeout)
		state.game.rest_timeout = 0
	}
	step_index = 0
	tour_game = state.game.sens
	tutorial_view_el.setAttribute("active", "")
	show_step()
}
/**
 * @param {number} left
 * @param {number} top
 * @param {number} right
 * @param {number} bottom
 * @returns {void}
 */
function place_tip(left, top, right, bottom) {
	const { style } = tutorial_tip_el
	const tip_height = tutorial_tip_el.offsetHeight
	const tip_width = tutorial_tip_el.offsetWidth
	const max_left = innerWidth - tip_width - GAP
	const max_top = innerHeight - tip_height - GAP
	let tip_left = (left + right - tip_width) / 2
	let tip_top = bottom + GAP
	if (tip_top > max_top) {
		tip_top = top - GAP - tip_height
		if (tip_top < GAP) {
			tip_left = right + GAP
			tip_top = top
			if (tip_left > max_left) {
				tip_left = left - GAP - tip_width
			}
		}
	}
	style.left = `${clamp(GAP, tip_left, max_left)}px`
	style.top = `${clamp(GAP, tip_top, max_top)}px`
}
/**
 * @param {GameSensName} game
 * @returns {TutorialStep[]}
 */
function sens_step(game) {
	const { el, extras, text } = sens_cards[game]
	/** @type {TutorialStep[]} */
	const card_steps = [
		{ el, game, keys: NO_KEYS, text }
	]
	for (const extra of extras || []) {
		card_steps.push(
			{
				el: extra.el,
				game,
				keys: NO_KEYS,
				text: extra.text
			}
		)
	}
	return card_steps
}
/**
 * @param {boolean} on
 * @returns {void}
 */
function show_hud_preview(on) {
	tutorial_view_el.toggleAttribute("hud-preview", on)
	if (on) {
		set_attr_if_changed(
			accuracy_el,
			"value",
			HUD_PREVIEW.accuracy
		)
		set_attr_if_changed(
			crit_rate_el,
			"value",
			HUD_PREVIEW.crit_rate
		)
		set_attr_if_changed(
			peak_score_el,
			"value",
			HUD_PREVIEW.peak_score
		)
		set_text_if_changed(fov_el, HUD_PREVIEW.fov)
		set_text_if_changed(
			sens_error_el,
			HUD_PREVIEW.sens_error
		)
		set_text_if_changed(timer_el, HUD_PREVIEW.timer)
	} else {
		accuracy_el.removeAttribute("value")
		crit_rate_el.removeAttribute("value")
		peak_score_el.removeAttribute("value")
		set_text_if_changed(fov_el, HUD_BLANK)
		set_text_if_changed(sens_error_el, HUD_BLANK)
		set_text_if_changed(timer_el, HUD_BLANK)
	}
}
/** @returns {void} */
function show_step() {
	const { el, game, keys, text } = steps[step_index]
	set_active_game_sens(game || tour_game)
	game_sens_list_el.toggleAttribute("open", el == game_sens_list_el)
	show_hud_preview(
		el == hud_score_el || el == hud_status_el
	)
	if (el && setting_view_el.contains(el)) {
		open_setting_view(el)
	} else if (setting_view_el.hasAttribute("active")) {
		close_setting_view()
	}
	tutorial_keys_el.textContent = lang_text(keys)
	tutorial_next_btn.textContent = lang_text(
		step_index < steps.length - 1 ? NEXT_LABEL : DONE_LABEL
	)
	tutorial_prev_btn.disabled = !step_index
	tutorial_prev_btn.textContent = lang_text(PREV_LABEL)
	tutorial_progress_el.textContent = `${step_index + 1} / ${steps.length}`
	tutorial_skip_btn.textContent = lang_text(SKIP_LABEL)
	tutorial_text_el.textContent = lang_text(text)
	layout_tutorial()
}
/**
 * @param {number} step
 * @returns {void}
 */
export function step_tutorial(step) {
	const next_index = step_index + step
	if (next_index < 0) {
		return
	}
	if (next_index == steps.length) {
		stop_tutorial()
		return
	}
	step_index = next_index
	show_step()
}
/** @returns {void} */
export function stop_tutorial() {
	tutorial_view_el.removeAttribute("active")
	show_hud_preview(false)
	set_active_game_sens(tour_game)
	close_game_sens_list()
	if (setting_view_el.hasAttribute("active")) {
		close_setting_view()
	}
}