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
	if not require(game.menu_open and game.menu_overlay.visible and not game.radio_panel.visible and game.audio.music_player != null, "main menu hides gameplay radio and initializes audio"):
		return
	if not require(game.get_node("HUD/Hint") is LiftKeyHints and game.get_node("HUD/HintRight") is LiftKeyHints and game.prompt_label is LiftKeyHints, "movement, combat and interaction hints use matching keycaps"):
		return
	game.prompt_label.set_hints("E|ОБЫСКАТЬ ЯЩИК")
	if not require(game.prompt_label.hint_text == "E|ОБЫСКАТЬ ЯЩИК", "interaction keycap changes with the nearby action"):
		return
	game.open_settings()
	if not require(game.settings_open and game.settings_panel.visible, "settings available from main menu"):
		return
	game.sound_toggle.button_pressed = false
	if not require(not game.audio.enabled, "sound toggle controls audio engine"):
		return
	game.sound_toggle.button_pressed = true
	game._unhandled_input(press(KEY_ESCAPE))
	if not require(not game.settings_open and game.menu_open, "settings return to main menu"):
		return
	game.continue_button.emit_signal("pressed")
	if not require(not game.menu_open and not game.paused and not game.menu_overlay.visible and game.radio_panel.visible, "continue button starts gameplay and resumes radio"):
		return
	game._unhandled_input(press(KEY_I))
	var down := InputEventMouseButton.new()
	down.button_index = MOUSE_BUTTON_LEFT
	down.position = Vector2(263, 180)
	down.pressed = true
	game.inventory_view._gui_input(down)
	var motion := InputEventMouseMotion.new()
	motion.position = Vector2(475, 603)
	game.inventory_view._gui_input(motion)
	var up := InputEventMouseButton.new()
	up.button_index = MOUSE_BUTTON_LEFT
	up.position = motion.position
	up.pressed = false
	game.inventory_view._gui_input(up)
	if not require(game.inventory_view.quick_slots[0] == "pistol", "inventory drag assigns hotbar slot"):
		return
	game.inventory_view.assign_quick_slot(1, "pistol")
	if not require(game.inventory_view.quick_slots[0] == "medkit" and game.inventory_view.quick_slots[1] == "pistol", "assigning an existing item swaps slots without duplicates"):
		return
	game.inventory_view.dragging_uid = "test"
	game._unhandled_input(press(KEY_I))
	if not require(game.inventory_view.dragging_uid == "", "closing inventory cancels item drag"):
		return
	game.inventory_view.quick_slots[2] = "flashlight"
	game.use_quick_slot(2)
	if not require(game.flashlight_on, "quick slot toggles flashlight even without separate inventory item"):
		return
	game.use_quick_slot(2)
	if not require(not game.flashlight_on, "quick slot toggles flashlight off"):
		return
	game._unhandled_input(press(KEY_ESCAPE))
	if not require(game.paused and game.menu_overlay.visible and game.save_button.visible and game.menu_button.visible, "pause screen exposes save and main-menu actions"):
		return
	game.menu_button.emit_signal("pressed")
	if not require(game.menu_open and not game.save_button.visible, "return to main menu is separate from saving"):
		return
	game.get_node("HUD/MenuOverlay/MenuButtons/NewButton").emit_signal("pressed")
	if not require(game.floor_number == 51 and not game.menu_open, "new-game button resets at rooftop"):
		return
	DirAccess.remove_absolute(ProjectSettings.globalize_path(LiftAudio.SETTINGS_PATH))
	print("PASS: menu buttons, settings, pause and new game")
	quit(0)
