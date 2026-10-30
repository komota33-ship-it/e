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
	game.get_node("HUD/MenuOverlay/MenuButtons/BaseButton").emit_signal("pressed")
	if not require(game.base_view.visible and not game.menu_overlay.visible and game.paused, "Heroes-like base opens from menu"):
		return
	if not require(not game.base_view.preset_buttons["assault"].disabled, "starter stash makes the first loadout selectable"):
		return
	game.base_view.apply_preset("assault")
	if not require(int(game.base_store.state()["prepared"].get("ammo", 0)) == 24, "base preset button prepares supplies"):
		return
	game.progression.profile["dna"] = 1000
	game.base_view.upgrade_base()
	if not require(int(game.base_store.state()["level"]) == 2 and int(game.progression.profile["dna"]) == 500, "base level upgrade spends DNA"):
		return
	game.base_view.select_room("medical")
	game.base_view.upgrade_selected()
	if not require(game.base_store.room_level("medical") == 1, "room upgrade is wired through base view"):
		return
	game.base_view.exit_requested.emit()
	if not require(game.menu_open and not game.base_view.visible, "base exits to menu"):
		return
	var starter_ammo: int = game.bag.total("ammo")
	game.start_new_game()
	if not require(game.bag.total("ammo") == starter_ammo + 24 and game.base_store.state()["prepared"].is_empty(), "starting a run transfers selected supplies exactly once"):
		return
	var encounter_count := 0
	for number in range(50, 1, -1):
		game.load_floor(number)
		if game.encounter_state.is_empty():
			continue
		encounter_count += 1
		if not require(game.maps[str(number)]["rooms"].has(game.encounter_state["room"]), "every survivor is assigned to an existing room"):
			return
		game.current_action = {"type": "door", "id": game.encounter_state["room"]}
		game.interact()
		if not require(game.enemies.is_empty(), "survivor rooms contain no zombies"):
			return
		game.current_action = {"type": "exit"}
		game.interact()
	if not require(encounter_count == 17, "survivors appear on roughly forty percent of eligible floors"):
		return
	game.load_floor(50)
	if not require(game.encounter_state.get("id", "") == "wounded", "first floor survivor follows encounter schedule"):
		return
	if not require(str(game.encounter_state.get("room", "")).begins_with("medical"), "wounded doctor is placed in the medical room"):
		return
	game.current_action = {"type": "door", "id": game.encounter_state["room"]}
	game.interact()
	if not require(game.room_id == game.encounter_state["room"] and game.enemies.is_empty(), "survivor room is safe for dialogue"):
		return
	game.player_x = float(game.encounter_state["x"])
	if not require(game.nearest_action().get("type", "") == "survivor", "survivor is interactable at its floor position"):
		return
	game.open_encounter()
	if not require(game.encounter_view.visible and game.paused and not game.encounter_view.choice_buttons[0].disabled, "encounter dialogue opens with available choice"):
		return
	var medkits: int = game.bag.total("medkit")
	game.resolve_encounter(0)
	if not require(game.base_store.has_npc("medic") and game.bag.total("medkit") == medkits - 1 and bool(game.encounter_state["resolved"]), "rescue consumes item and recruits medic once"):
		return
	game.close_encounter()
	game.current_action = {"type": "exit"}
	game.interact()
	game.world_states["50"] = game.snapshot_floor()
	game.load_floor(49)
	game.load_floor(50)
	if not require(bool(game.encounter_state["resolved"]) and game.nearest_action().get("type", "") != "survivor", "resolved survivor is persisted and cannot be recruited twice"):
		return
	print("PASS: base screen, upgrades, survivor interaction and one-time persistence")
	quit(0)
