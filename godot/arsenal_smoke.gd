extends SceneTree

func _initialize() -> void:
	call_deferred("run_checks")

func require(ok: bool, message: String) -> bool:
	if not ok:
		printerr("FAIL: %s" % message)
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
	game.load_floor(50)
	game.player_x = 100.0
	if not require(game.textures.has("weapon_arsenal") and game.textures.has("hero_support_arm"), "matched arm and weapon art is imported"):
		return
	for sector in [{"high": 40, "low": 31, "gun": "smg", "ammo": "ammo"}, {"high": 30, "low": 21, "gun": "assault", "ammo": "rifle_ammo"}, {"high": 20, "low": 11, "gun": "rifle", "ammo": "sniper_ammo"}, {"high": 10, "low": 2, "gun": "railgun", "ammo": "energy_cell"}]:
		var found_gun := false
		var found_ammo := false
		for floor_number in range(int(sector["low"]), int(sector["high"]) + 1):
			var level: Dictionary = game.maps[str(floor_number)]
			var scenes: Array = [level]
			scenes.append_array(level["rooms"].values())
			for scene in scenes:
				for container in scene.get("containers", []):
					for item in container["loot"]:
						found_gun = found_gun or item["type"] == sector["gun"]
						found_ammo = found_ammo or item["type"] == sector["ammo"]
		if not require(found_gun and found_ammo, "%s and matching ammunition can be found in its tower sector" % sector["gun"]):
			return
	for kind in ["smg", "assault", "rifle", "railgun"]:
		game.enemies.clear()
		game.reload_timer = 0.0
		game.bag.items.clear()
		game.bag.add_item(kind, 1, {"loaded": 2})
		var weapon: Dictionary = game.bag.items[0]
		game.active_weapon_uid = weapon["uid"]
		var ammo_type: String = game.bag.definition(kind)["ammo"]
		game.bag.add_item(ammo_type, 10)
		var target: Dictionary = game.make_enemy("walker", 350.0)
		target["hp"] = 1000.0
		target["maxHp"] = 1000.0
		game.enemies.append(target)
		game.fire_timer = 0.0
		game.shoot(Vector2(350.0, game.actor_ground() - 70.0))
		if not require(int(weapon["loaded"]) == 1 and float(target["hp"]) < 1000.0, "%s fires its own ammunition and hits" % kind):
			return
		game.reload_timer = 0.0
		game.reload_weapon()
		if not require(game.reload_timer > 0.0, "%s starts reloading from matching ammunition" % kind):
			return
		game.finish_reload()
		if not require(int(weapon["loaded"]) > 1 and game.bag.total(ammo_type) < 10, "%s reload consumes matching ammunition" % kind):
			return
	game.enemies.clear()
	game.reload_timer = 0.0
	game.bag.items.clear()
	game.bag.add_item("railgun", 1, {"loaded": 1})
	game.active_weapon_uid = game.bag.items[0]["uid"]
	for x in [350.0, 450.0, 550.0]:
		var enemy: Dictionary = game.make_enemy("walker", x)
		enemy["hp"] = 1000.0
		enemy["maxHp"] = 1000.0
		game.enemies.append(enemy)
	game.fire_timer = 0.0
	game.shoot(Vector2(800.0, game.actor_ground() - 75.0))
	if not require(game.enemies.all(func(enemy: Dictionary) -> bool: return enemy["hp"] < 1000.0), "railgun pierces three aligned targets"):
		return
	print("PASS: five firearm categories, matching ammunition, reload and rail penetration")
	quit(0)
