extends SceneTree

func _initialize() -> void:
	call_deferred("run_checks")

func require(value: bool, reason: String) -> bool:
	if not value:
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
	game.menu_open = false
	game.menu_backdrop.visible = false
	game.close_panel()
	game.reset_run_state()
	game.reset_inventory()
	game.load_floor(39)
	game.enemies.clear()
	var before: int = game.health
	game.player_hit(7)
	if not require(game.health < before and game.infection > 0, "bite damages and infects"):
		return
	game.hit_timer = 0.0
	game.stamina = 100.0
	game.start_dodge()
	before = game.health
	game.player_hit(20)
	if not require(game.stamina == 75.0 and game.health == before, "dodge spends stamina and grants brief invulnerability"):
		return
	game.dodge_time = 0.0
	game.hit_timer = 0.0
	game.player_x = float(game.layout["hazards"][0][0]) * game.scale_factor + 8.0
	game.update_hazards(1.0)
	if not require(game.health < before, "laboratory puddle damages player"):
		return
	game.add_noise(120)
	game.update_noise(0.1)
	if not require(game.noise_warning > 0.0, "loud noise warns before horde"):
		return
	game.update_noise(3.1)
	if not require(game.enemies.size() >= 4, "noise wave spawns enemies"):
		return
	var trapped: Dictionary = {}
	for container in game.layout["containers"]:
		if container.get("trap") is Dictionary:
			trapped = container
			break
	game.player_x = (float(trapped["rect"][0]) + float(trapped["rect"][2]) * 0.5) * game.scale_factor
	game.trigger_container_hazards(trapped)
	if not require(game.active_traps.size() == 1 and game.active_traps[0]["status"] == "warning", "searched container reveals timed trap"):
		return
	game.current_action = game.nearest_action()
	if not require(game.current_action.get("type") == "trap", "trap can be targeted before activation"):
		return
	game.interact()
	game.update_traps(0.7)
	if not require(game.active_traps[0]["status"] == "disarmed", "interaction disarms trap"):
		return
	game.load_floor(45)
	var door: Dictionary = game.layout["doors"][0]
	game.player_x = (float(door["rect"][0]) + float(door["rect"][2]) * 0.5) * game.scale_factor
	game.current_action = game.nearest_action()
	game.interact()
	game.health = 73
	game.infection = 27
	game.battery = 31
	game.spent_containers["persistent:container"] = true
	game.bag.add_item("grenade", 1)
	var saved_room: String = game.room_id
	var saved_grenades: int = game.bag.total("grenade")
	game.test_mode = false
	game.save_game()
	game.test_mode = true
	game.health = 1
	game.load_floor(10)
	game.restore_checkpoint()
	if not require(game.floor_number == 45 and game.room_id == saved_room and game.health == 73, "checkpoint restores exact room and health"):
		return
	if not require(game.spent_containers.has("persistent:container") and game.bag.total("grenade") == saved_grenades and game.infection == 27.0 and game.battery == 31.0, "checkpoint restores floor, supplies and survival state"):
		return
	game.load_floor(50)
	var workshop_door: Dictionary = {}
	for entry in game.layout["doors"]:
		if entry["kind"] == "technical":
			workshop_door = entry
			break
	game.player_x = (float(workshop_door["rect"][0]) + float(workshop_door["rect"][2]) * 0.5) * game.scale_factor
	game.current_action = game.nearest_action()
	game.interact()
	game.bag.add_item("cloth", 2)
	var bandages_before: int = game.bag.total("bandage")
	game.craft_inventory_item("bandage")
	if not require(not game.crafting.is_empty() and game.bag.total("bandage") == bandages_before, "workshop craft takes time before spending ingredients"):
		return
	game.update_crafting(3.0)
	if not require(game.crafting.is_empty() and game.bag.total("bandage") == bandages_before + 1, "workshop completes and grants crafted item"):
		return
	game.progression.profile["perks"]["looter"] = 2
	game.progression.profile["perks"]["luck"] = 3
	game.progression.profile["perks"]["attentive"] = 2
	game.load_floor(0)
	var lucky_container: Dictionary = {}
	for entry in game.layout["containers"]:
		if entry["id"] == "supplies-0":
			lucky_container = entry
			break
	var lucky: Array = game.prepare_container_contents("luck-test", lucky_container)
	if not require(lucky.any(func(item: Dictionary) -> bool: return item["type"] == "shotgun") and lucky.any(func(item: Dictionary) -> bool: return item["type"] == "ammo" and item["qty"] == 2), "Luck and Looter add seeded rare and common supplies"):
		return
	DirAccess.remove_absolute(ProjectSettings.globalize_path(game.SAVE_PATH))
	print("PASS: infection, dodge, hazards, noise horde, timed crafting and checkpoint restore")
	quit(0)
