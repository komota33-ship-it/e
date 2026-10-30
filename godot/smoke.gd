extends SceneTree

func _initialize() -> void:
	call_deferred("run_checks")

func check(value: bool, description: String) -> bool:
	if not value:
		printerr("FAIL: %s" % description)
		quit(1)
		return false
	return true

func run_checks() -> void:
	var game: Variant = load("res://godot/main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game.test_mode = true
	game.progression.test_mode = true
	if not check(game.textures.has("floor_surfaces"), "shared floor painting loads for every tower zone"):
		return
	for key in game.textures:
		if str(key).begins_with("walk_") or str(key).begins_with("death_") or str(key).begins_with("melee_") or str(key).begins_with("spit_") or str(key).begins_with("scream_") or str(key).begins_with("volley_") or str(key).begins_with("surrender_") or str(key).begins_with("motion_"):
			if not check(game.sprite_anchors.has(key) and game.sprite_anchors[key].size() >= 8, "sprite sheet %s has ground anchors" % key):
				return
		if str(key).begins_with("death_"):
			var death_layout: Dictionary = game.sprite_death_layouts.get(key, {})
			if not check(death_layout.has("split") and death_layout.get("bottoms", []).size() == 8, "death sheet %s has its own row boundary and ground anchors" % key):
				return
			var split := int(death_layout["split"])
			var height: int = game.textures[key].get_height()
			if not check(split > 0 and split < height and int(death_layout["bottoms"][0]) <= split and int(death_layout["bottoms"][7]) <= height - split, "death sheet %s keeps complete frames inside its rows" % key):
				return
	if not check(int(game.sprite_death_layouts["death_walker"]["bottoms"][0]) > 512 and int(game.sprite_death_layouts["death_player"]["bottoms"][0]) > 443, "falling frames extend past the old grid instead of losing their feet"):
		return
	if not check(game.sprite_anchors["walk_player"][1] != game.sprite_anchors["walk_player"][5], "uneven walking frames receive distinct ground offsets"):
		return
	game.journal_found.clear()
	if not check(game.menu_open, "main menu opens before gameplay"):
		return
	var enter := InputEventKey.new()
	enter.keycode = KEY_ENTER
	enter.pressed = true
	game._unhandled_input(enter)
	if not check(not game.menu_open and not game.paused, "main menu starts the game"):
		return
	game.reset_inventory()
	game.played_story.clear()
	game.load_floor(51)
	if not check(game.floor_number == 51, "starts on the roof"):
		return
	if not check(game.played_story.has("roof") and game.radio_panel.visible, "roof radio story plays"):
		return
	var bag_key := InputEventKey.new()
	bag_key.keycode = KEY_I
	bag_key.pressed = true
	game._unhandled_input(bag_key)
	if not check(game.inventory_view.shown and game.paused, "inventory pauses combat"):
		return
	game._unhandled_input(bag_key)
	if not check(not game.inventory_view.shown and not game.paused, "inventory closes"):
		return
	if not check(game.enemies.size() == 2, "roof enemies spawned"):
		return
	game.health = 50
	for item in game.bag.items:
		if item["type"] == "medkit":
			game.use_inventory_item(item["uid"])
			break
	if not check(game.health == 100 and game.bag.total("medkit") == 0, "healing consumes inventory item"):
		return
	game.enemies[0]["x"] = 350.0
	var remaining: int = game.ammo
	game.shoot(Vector2(350, 485))
	if not check(game.ammo == remaining - 1, "pistol fires toward mouse"):
		return
	if not check(game.enemies[0]["hp"] < 42, "mouse-aimed round hits zombie"):
		return
	var supplies: Array = game.layout["containers"][0]["rect"]
	game.player_x = (float(supplies[0]) + float(supplies[2]) * 0.5) * game.scale_factor
	game.current_action = game.nearest_action()
	if not check(game.current_action.get("type") == "loot", "roof supplies line up with artwork"):
		return
	var old_rounds: int = game.bag.total("ammo")
	game.interact()
	if not check(not game.searching.is_empty() and game.search_bar.visible, "search progress starts"):
		return
	game.update_search(3.0, 0.0)
	if not check(game.bag.total("ammo") > old_rounds, "search adds real inventory loot"):
		return
	var dropped_uid := ""
	for item in game.bag.items:
		if item["type"] == "bandage":
			dropped_uid = item["uid"]
			break
	game.drop_inventory_item(dropped_uid)
	if not check(game.dropped_items.size() == 1, "dropping leaves supply bag"):
		return
	game.current_action = game.nearest_action()
	if not check(game.current_action.get("type") == "drop", "dropped supplies can be targeted"):
		return
	game.interact()
	if not check(game.dropped_items.is_empty(), "dropped supplies can be recovered"):
		return
	var lift: Array = game.layout["lift"]["rect"]
	game.player_x = (float(lift[0]) + float(lift[2]) * 0.5) * game.scale_factor
	game.current_action = game.nearest_action()
	if not check(game.current_action.get("type") == "lift", "roof staircase matches art"):
		return
	game.interact()
	if not check(game.floor_number == 50 and game.layout["zone"] == "office", "roof descends to floor 50"):
		return
	if not check(game.actor_ground() == game.GROUND + game.WALKWAY_DEPTH, "corridor actors stand inside the floor depth instead of against the back wall"):
		return
	var corridor_top: float = game.GROUND - float(game.layout["ground"]) * game.scale_factor
	var corridor_bottom: float = corridor_top + float(game.layout["crop"][3]) * game.scale_factor
	if game.layout.get("uniqueBackground", false):
		var panoramic_part: Dictionary = game.layout["parts"].filter(func(part: Dictionary) -> bool: return part.has("uniqueGround"))[0]
		corridor_top = game.GROUND - float(panoramic_part["uniqueGround"])
		corridor_bottom = corridor_top + float(panoramic_part["height"]) * game.scale_factor
	var screen_top: float = 360.0 + (corridor_top - game.camera.position.y) * game.camera.zoom.y
	var screen_bottom: float = 360.0 + (corridor_bottom - game.camera.position.y) * game.camera.zoom.y
	if not check(screen_top <= 0.0 and screen_bottom >= 600.0, "corridor art covers the visible wall and walk plane"):
		return
	for container in game.layout["containers"]:
		if container["id"] == "landmark-50":
			var landmark: Array = container["rect"]
			game.player_x = (float(landmark[0]) + float(landmark[2]) * 0.5) * game.scale_factor
			game.current_action = game.nearest_action()
			game.interact()
			game.update_search(5.0, 0.0)
			break
	if not check(game.journal_open and game.journal_found.has("log-01"), "floor story note opens persistent archive"):
		return
	game.close_journal()
	game.progression.profile["dna"] = 1000
	game.dna = 1000
	game.open_progress()
	if not check(game.progress_open and game.perk_list.item_count == game.catalog["perks"].size(), "perks open in native UI"):
		return
	game.buy_selected_perk()
	if not check(game.progression.rank(game.perk_ids[0]) == 1 and game.dna < 1000, "perk purchase changes persistent profile"):
		return
	game.close_progress()
	var door: Dictionary = game.layout["doors"][0]
	var rect: Array = door["rect"]
	game.player_x = (float(rect[0]) + float(rect[2]) * 0.5) * game.scale_factor
	game.current_action = game.nearest_action()
	if not check(game.current_action.get("type") == "door", "door matches painted coordinates"):
		return
	game.interact()
	if not check(game.room_id == door["id"], "enters room"):
		return
	if not check(game.actor_ground() == game.GROUND + game.WALKWAY_DEPTH * 0.5, "small rooms use a shallower walk plane without clipping the ceiling"):
		return
	var room_top: float = 360.0 + (game.GROUND - float(game.layout["ground"]) * game.scale_factor - game.camera.position.y) * game.camera.zoom.y
	if not check(room_top >= 0.0 and room_top <= 100.0 and game.world_width * game.camera.zoom.x >= 800.0, "small rooms fill the viewport at a readable scale"):
		return
	var exit_rect: Array = game.layout["exit"]["rect"]
	game.player_x = (float(exit_rect[0]) + float(exit_rect[2]) * 0.5) * game.scale_factor
	game.current_action = game.nearest_action()
	if not check(game.current_action.get("type") == "exit", "room exit matches painting"):
		return
	game.interact()
	if not check(game.room_id == "" and game.floor_number == 50, "returns to corridor"):
		return
	if not check(game.enemies.size() >= 4, "corridor encounter restored"):
		return
	for number in range(51, -1, -1):
		if number == 1:
			continue
		game.load_floor(number)
		if not check(game.world_width > 400.0 and game.textures.has(game.layout["art"]), "floor %d has renderable layout" % number):
			return
		for entry in game.layout.get("doors", []):
			var location: Array = entry["rect"]
			var center: float = (float(location[0]) + float(location[2]) * 0.5) * game.scale_factor
			if not check(center > 0 and center < game.world_width and game.layout["rooms"].has(entry["id"]), "floor %d door and room" % number):
				return
	game.load_floor(0)
	if not check(game.enemies.size() == 1 and game.enemies[0]["type"] == "boss", "Object 0 at B1"):
		return
	game.enemies[0]["dead"] = true
	lift = game.layout["lift"]["rect"]
	game.player_x = (float(lift[0]) + float(lift[2]) * 0.5) * game.scale_factor
	game.current_action = game.nearest_action()
	game.interact()
	if not check(game.ending_open, "three endings unlock after boss"):
		return
	for index in 3:
		game.select_ending(index)
		if not check(game.ending_image.texture != null and game.ending_story.text.length() > 1000, "illustration and story for ending %d" % index):
			return
	game.select_ending(2)
	var wins_before: int = game.progression.profile["wins"]
	game.complete_ending()
	if not check(game.run_finished and game.completed_endings.has("truth"), "ending records completion once"):
		return
	game.complete_ending()
	if not check(game.progression.profile["wins"] == wins_before + 1, "repeated confirmation cannot farm wins"):
		return
	game.close_ending()
	if not check(game.menu_open and game.continue_button.text == "НОВЫЙ СПУСК", "completed run returns to main menu"):
		return
	print("PASS: Godot roof, floors, doors, room, boss and visual endings")
	quit(0)
