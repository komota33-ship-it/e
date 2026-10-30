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
	if not require(game.textures.has("hero_torso"), "complete survivor body loads"):
		return
	if not require(game.textures["hero_torso"].resource_path.ends_with("hero_master.png"), "plain shoulder master loads"):
		return
	for frame_name in game.HERO_WALK_FRAMES:
		if not require(game.textures.has(frame_name), "%s complete walking frame loads" % frame_name):
			return
		if not require(absf(float(game.HERO_FOOT_BASELINES[frame_name]) - 1380.0) <= 15.0, "%s boot baseline stays grounded" % frame_name):
			return
	game.player_move_blend = 1.0
	for step in 4:
		game.walk_distance = (float(step) + 0.1) / 4.0 * game.HERO_STRIDE
		if not require(game.hero_frame_name() == game.HERO_WALK_FRAMES[step], "contact and passing frames follow stride order at step %d" % step):
			return
	game.player_move_blend = 0.0
	if not require(game.hero_frame_name() == "hero_torso", "standing still restores intact idle figure"):
		return
	game.player_x = 400.0
	game.facing = 1
	var right_shoulder: Vector2 = game.player_shoulder()
	game.facing = -1
	var left_shoulder: Vector2 = game.player_shoulder()
	if not require(absf((right_shoulder.x + left_shoulder.x) * 0.5 - game.player_x) < 0.01 and absf(right_shoulder.y - left_shoulder.y) < 0.01, "weapon shoulder mirrors without shifting vertically"):
		return
	game.facing = 1
	game.aim_angle = 0.0
	for offset in [-10.0, 10.0, -8.0, 8.0]:
		game.update_aim(Vector2(game.player_x + offset, game.GROUND + 240.0), 0.2)
		if not require(game.facing == 1 and game.player_aim_angle() > 1.3 and game.player_aim_vector().x > 0.0, "vertical downward aim keeps the body facing and weapon direction stable"):
			return
	game.update_aim(Vector2(game.player_x - 200.0, game.GROUND + 240.0), 0.2)
	if not require(game.facing == -1 and game.player_aim_vector().x < 0.0, "deliberate aim far across the body still turns the courier"):
		return
	game.facing = 1
	game.aim_angle = 0.0
	var shoulder: Vector2 = game.player_shoulder()
	game.update_aim(shoulder + Vector2(0.0, -4.0), 1.0 / 60.0)
	game.update_aim(shoulder + Vector2(0.0, 4.0), 1.0 / 60.0)
	if not require(absf(game.player_aim_angle()) < 0.1, "cursor crossing the shoulder does not snap the arm between up and down"):
		return
	game.continue_game()
	game.reset_inventory()
	game.load_floor(51)
	game.player_x = 500.0
	game.facing = -1
	game.enemies[0]["x"] = 350.0
	var old_hp: float = game.enemies[0]["hp"]
	game.shoot(Vector2(350.0, game.GROUND - 70.0))
	if not require(game.enemies[0]["hp"] < old_hp, "left-facing aim reaches a zombie"):
		return
	game.enemies.clear()
	game.player_x = 100.0
	game.facing = 1
	game.aim_angle = 0.0
	var forward_enemy: Dictionary = game.make_enemy("walker", 350.0)
	game.enemies.append(forward_enemy)
	game.fire_timer = 0.0
	game.shoot()
	if not require(forward_enemy["hp"] < forward_enemy["maxHp"], "mouse-controlled shot follows the same stable direction as the weapon arm"):
		return
	print("PASS: whole-body gait, stable mouse aim, mirrored shoulder and left-facing shot")
	quit(0)
