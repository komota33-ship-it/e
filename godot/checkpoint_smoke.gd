extends SceneTree

func _initialize() -> void:
	call_deferred("run_checks")

func require(ok: bool, reason: String) -> bool:
	if not ok:
		printerr("FAIL: %s" % reason)
		quit(1)
		return false
	return true

func run_checks() -> void:
	var game: Variant = load("res://godot/main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game.test_mode = true
	game.progression.test_mode = true
	game.start_new_game()
	if not require(not game.checkpoint_banner.visible, "no checkpoint banner on the rooftop"):
		return
	var lift: Array = game.layout["lift"]["rect"]
	game.player_x = (float(lift[0]) + float(lift[2]) * 0.5) * game.scale_factor
	game.current_action = game.nearest_action()
	if not require(game.current_action.get("type") == "lift", "rooftop exit aligns with the artwork"):
		return
	game.test_mode = false
	game.interact()
	if not require(game.floor_number == 50 and FileAccess.file_exists(game.SAVE_PATH) and game.checkpoint_banner.visible, "first checkpoint is saved and announced on floor 50"):
		return
	if not require("ЭТАЖ 50" in game.checkpoint_detail.text, "checkpoint banner names the saved floor"):
		return
	game.update_checkpoint_banner(0.3)
	if not require(game.checkpoint_banner.modulate.a > 0.9, "checkpoint notice fades in"):
		return
	game.update_checkpoint_banner(4.0)
	if not require(not game.checkpoint_banner.visible, "checkpoint notice disappears"):
		return
	game.load_floor(49)
	if not require(not game.checkpoint_banner.visible and game.save_game(), "manual save works without checkpoint notification"):
		return
	if not require(not game.checkpoint_banner.visible, "manual save does not impersonate a floor checkpoint"):
		return
	DirAccess.remove_absolute(ProjectSettings.globalize_path(game.SAVE_PATH))
	print("PASS: checkpoint save, banner timing and manual save distinction")
	quit(0)
