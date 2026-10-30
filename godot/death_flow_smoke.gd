extends SceneTree

func _initialize() -> void:
	call_deferred("run_checks")

func require(ok: bool, reason: String) -> bool:
	if not ok:
		printerr("FAIL: %s" % reason)
		quit(1)
		return false
	return true

func press(code: Key) -> InputEventKey:
	var event := InputEventKey.new()
	event.keycode = code
	event.pressed = true
	return event

func run_checks() -> void:
	var game: Variant = load("res://godot/main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game.test_mode = true
	game.progression.test_mode = true
	game.start_new_game()
	var deaths: int = int(game.progression.profile["deaths"])
	game.searching = {"key": "unfinished"}
	game.search_bar.visible = true
	game.crafting = {"recipe": "bandage"}
	game.health = 0
	game.die()
	if not require(game.death_open and not game.death_overlay.visible and game.paused and not game.radio_panel.visible and int(game.progression.profile["deaths"]) == deaths + 1, "death starts the falling animation, hides radio and counts once"):
		return
	if not require(game.searching.is_empty() and game.crafting.is_empty() and not game.search_bar.visible and not game.prompt_label.visible, "death cancels searching, crafting and interaction hints"):
		return
	if not require("НОВЫЙ СПУСК" in game.death_hint.hint_text, "death screen describes a rooftop restart when no checkpoint exists"):
		return
	game.die()
	if not require(int(game.progression.profile["deaths"]) == deaths + 1, "repeated death call cannot count twice"):
		return
	game._unhandled_input(press(KEY_ESCAPE))
	if not require(game.death_open and game.paused, "escape cannot resume a dead player"):
		return
	game._unhandled_input(press(KEY_ENTER))
	if not require(game.death_open, "retry cannot skip the falling animation"):
		return
	game.update_player_death(0.5)
	if not require(game.player_death_age == 0.5 and not game.death_overlay.visible, "hero remains visible through the fall"):
		return
	game.update_player_death(0.5)
	if not require(game.death_overlay.visible and game.death_overlay.modulate.a > 0.0 and game.death_overlay.modulate.a < 1.0, "death menu fades in after the fall"):
		return
	game.update_player_death(0.2)
	if not require(game.player_death_age == game.PLAYER_DEATH_DURATION and game.death_overlay.modulate.a == 1.0, "death menu becomes ready after the final pose"):
		return
	game.death_checkpoint_button.emit_signal("pressed")
	if not require(not game.death_open and not game.paused and game.health == 100 and game.floor_number == 51, "without checkpoint the retry button begins a new rooftop run"):
		return
	game.load_floor(45)
	game.health = 63
	game.test_mode = false
	game.save_game()
	game.test_mode = true
	if not require(FileAccess.file_exists(game.SAVE_PATH), "checkpoint exists before testing restore"):
		return
	game.health = 0
	game.die()
	if not require("ЧЕКПОИНТ" in game.death_hint.hint_text, "death screen describes the existing checkpoint"):
		return
	game.update_player_death(game.PLAYER_DEATH_DURATION)
	game._unhandled_input(press(KEY_ENTER))
	if not require(not game.death_open and not game.paused and game.floor_number == 45 and game.health == 63, "enter restores the last checkpoint"):
		return
	game.health = 0
	game.die()
	game.update_player_death(game.PLAYER_DEATH_DURATION)
	game.death_base_button.emit_signal("pressed")
	if not require(not game.death_open and game.base_view.visible and game.paused and game.health == 100 and game.floor_number == 51, "base button abandons the run and opens the bunker"):
		return
	if not require(not FileAccess.file_exists(game.SAVE_PATH), "abandoned checkpoint is removed"):
		return
	if not require(int(game.progression.profile["deaths"]) == deaths + 3, "deaths persist across the three attempts"):
		return
	DirAccess.remove_absolute(ProjectSettings.globalize_path(game.SAVE_PATH))
	print("PASS: death screen, checkpoint retry, new run and bunker return")
	quit(0)
