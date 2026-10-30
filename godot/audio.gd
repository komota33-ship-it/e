class_name LiftAudio
extends Node

const SETTINGS_PATH := "user://lift_audio.json"
const RATE := 22050.0
const CHORDS := [
	[82.41, 123.47, 164.81],
	[73.42, 110.0, 146.83],
	[65.41, 98.0, 130.81],
	[73.42, 110.0, 164.81],
]

var enabled := true
var master_volume := 0.55
var music_volume := 0.28
var paused_game := false
var music_mode := "menu"
var combat_mix := 0.0
var boss_mix := 0.0
var ending_mix := 0.0
var music_player: AudioStreamPlayer
var sfx_player: AudioStreamPlayer
var music_playback: AudioStreamGeneratorPlayback
var sfx_playback: AudioStreamGeneratorPlayback
var music_time := 0.0
var sfx_time := 0.0
var sounds: Array[Dictionary] = []

func _ready() -> void:
	if FileAccess.file_exists(SETTINGS_PATH):
		var file := FileAccess.open(SETTINGS_PATH, FileAccess.READ)
		var data: Variant = JSON.parse_string(file.get_as_text())
		if data is Dictionary:
			enabled = bool(data.get("enabled", true))
			master_volume = clampf(float(data.get("volume", 0.55)), 0.0, 1.0)
			music_volume = clampf(float(data.get("music", 0.28)), 0.0, 1.0)
	music_player = make_player()
	sfx_player = make_player()
	music_playback = music_player.get_stream_playback()
	sfx_playback = sfx_player.get_stream_playback()

func make_player() -> AudioStreamPlayer:
	var player := AudioStreamPlayer.new()
	var stream := AudioStreamGenerator.new()
	stream.mix_rate = RATE
	stream.buffer_length = 0.12
	player.stream = stream
	add_child(player)
	player.play()
	return player

func save_settings() -> void:
	var file := FileAccess.open(SETTINGS_PATH, FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify({"enabled": enabled, "volume": master_volume, "music": music_volume}))

func play_sfx(kind: String) -> void:
	if not enabled or master_volume <= 0.0:
		return
	var duration: float = {"pistol": 0.22, "shotgun": 0.43, "smg": 0.13, "assault": 0.2, "rifle": 0.55, "heavy": 0.6, "zombie": 0.33, "hit": 0.18, "explosion": 0.8, "pickup": 0.16, "door": 0.35, "acid": 0.32, "ui": 0.08, "reload": 0.28}.get(kind, 0.16)
	sounds.append({"kind": kind, "start": sfx_time, "duration": duration, "pitch": randf_range(0.91, 1.08)})

func _process(_delta: float) -> void:
	if music_playback == null or sfx_playback == null:
		return
	fill_music()
	fill_sfx()

func fill_music() -> void:
	var count := mini(music_playback.get_frames_available(), 1600)
	for index in count:
		var t := music_time
		var transition := 1.0 / (RATE * 1.4)
		combat_mix = move_toward(combat_mix, 1.0 if music_mode in ["combat", "boss"] else 0.0, transition)
		boss_mix = move_toward(boss_mix, 1.0 if music_mode == "boss" else 0.0, transition)
		ending_mix = move_toward(ending_mix, 1.0 if music_mode == "ending" else 0.0, transition)
		var chord: Array = CHORDS[int(t / 8.0) % CHORDS.size()]
		var pulse := 0.76 + 0.24 * sin(t * 0.21)
		var sample := 0.0
		for frequency in chord:
			sample += sin(TAU * float(frequency) * t) * 0.15
		sample += sin(TAU * float(chord[0]) * 0.5 * t) * 0.16
		var bell_phase := fmod(t, 11.0)
		if bell_phase < 1.3:
			sample += sin(TAU * 659.25 * t) * exp(-bell_phase * 4.1) * 0.16
		# Low percussion appears with nearby threats and grows heavier for bosses.
		var beat := fmod(t, 0.57)
		if beat < 0.22:
			sample += sin(TAU * (65.0 - 155.0 * beat) * beat) * exp(-beat * 25.0) * (0.14 * combat_mix + 0.11 * boss_mix)
		var hat := fmod(t + 0.285, 0.285)
		if hat < 0.035:
			sample += (randf() * 2.0 - 1.0) * exp(-hat * 80.0) * 0.035 * combat_mix
		sample += sin(TAU * 41.2 * t) * 0.11 * boss_mix
		var ending_note: float = [164.81, 146.83, 123.47, 98.0][int(t / 3.0) % 4]
		var ending_phase := fmod(t, 3.0)
		var ending_sample := sin(TAU * ending_note * t) * exp(-ending_phase * 0.9) * 0.35
		sample = lerpf(sample, ending_sample, ending_mix)
		var gain := master_volume * music_volume * (0.18 if paused_game else 1.0) if enabled else 0.0
		var value := clampf(sample * pulse * gain, -1.0, 1.0)
		music_playback.push_frame(Vector2(value, value))
		music_time += 1.0 / RATE

func fill_sfx() -> void:
	var count := mini(sfx_playback.get_frames_available(), 1600)
	for index in count:
		var sample := 0.0
		for sound in sounds:
			var age: float = sfx_time - sound["start"]
			if age < 0.0 or age >= sound["duration"]:
				continue
			var env := pow(1.0 - age / float(sound["duration"]), 2.0)
			var kind: String = sound["kind"]
			var pitch: float = sound["pitch"]
			match kind:
				"pistol": sample += ((randf() * 2.0 - 1.0) * 0.53 + sin(TAU * (150.0 - age * 300.0) * age) * 0.3) * env
				"shotgun", "explosion": sample += ((randf() * 2.0 - 1.0) * 0.7 + sin(TAU * (75.0 - age * 65.0) * age) * 0.35) * env
				"smg": sample += ((randf() * 2.0 - 1.0) * 0.4 + sin(TAU * (225.0 - age * 750.0) * age) * 0.22) * env
				"assault": sample += ((randf() * 2.0 - 1.0) * 0.55 + sin(TAU * (170.0 - age * 480.0) * age) * 0.27) * env
				"rifle": sample += ((randf() * 2.0 - 1.0) * 0.62 + sin(TAU * (125.0 - age * 150.0) * age) * 0.36) * env
				"heavy": sample += (sin(TAU * (80.0 + 360.0 * age) * age) * 0.46 + (randf() * 2.0 - 1.0) * 0.26) * env
				"zombie": sample += (sin(TAU * 77.0 * pitch * age) * 0.35 + sin(TAU * 111.0 * pitch * age) * 0.15) * env
				"hit": sample += (randf() * 2.0 - 1.0) * env * 0.5
				"acid": sample += (sin(TAU * 430.0 * age) * 0.15 + (randf() * 2.0 - 1.0) * 0.2) * env
				"reload", "door", "pickup", "ui": sample += (randf() * 2.0 - 1.0) * env * 0.22
		var value := clampf(sample * master_volume * (1.0 if enabled else 0.0), -1.0, 1.0)
		sfx_playback.push_frame(Vector2(value, value))
		sfx_time += 1.0 / RATE
	for index in range(sounds.size() - 1, -1, -1):
		if sfx_time - float(sounds[index]["start"]) >= float(sounds[index]["duration"]):
			sounds.remove_at(index)
