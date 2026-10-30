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
	game.layout = game.layout.duplicate(true)
	game.layout["containers"] = []
	game.layout["doors"] = []
	game.layout.erase("lift")
	game.enemies.clear()
	game.bag.items.clear()
	game.bag.sequence = 1
	game.bag.add_item("ammo", 59)
	for index in 100:
		if game.bag.add_item("medkit") > 0:
			break
	if not require(game.bag.add_item("medkit") == 1, "backpack is full before partial pickup"):
		return
	game.dropped_items.append({"layout": game.layout["id"], "x": game.player_x, "item": {"type": "ammo", "qty": 5}})
	if not require("Патроны" in str(game.nearest_action().get("prompt", "")) and game.inventory_view.icons.has("loot"), "ground supplies identify the real item and have an icon sheet"):
		return
	game.current_action = {"type": "drop", "index": 0}
	game.interact()
	if not require(game.bag.total("ammo") == 60 and game.dropped_items.size() == 1 and int(game.dropped_items[0]["item"]["qty"]) == 4, "pickup takes only available stack space and leaves exact remainder"):
		return
	game.interact()
	if not require(game.bag.total("ammo") == 60 and int(game.dropped_items[0]["item"]["qty"]) == 4, "repeating pickup with full backpack cannot duplicate supplies"):
		return
	var medkit_uid := ""
	for item in game.bag.items:
		if item["type"] == "medkit":
			medkit_uid = item["uid"]
			break
	game.bag.remove_item(medkit_uid)
	game.interact()
	if not require(game.bag.total("ammo") == 64 and game.dropped_items.is_empty(), "remaining supplies are recovered once space is free"):
		return
	game.load_floor(30)
	var lift: Array = game.layout["lift"]["rect"]
	game.player_x = (float(lift[0]) + float(lift[2]) * 0.5) * game.scale_factor
	var action: Dictionary = game.nearest_action()
	if not require(action.get("type") == "lift" and str(action["prompt"]).begins_with("ЛИФТ ЗАБЛОКИРОВАН"), "boss blocks the lift with a warning prompt"):
		return
	game.prompt_label.set_hints(action["prompt"])
	if not require(game.prompt_label.hint_text == action["prompt"], "warning without a keycap is accepted by the interaction HUD"):
		return
	print("PASS: partial dropped-supply pickup and boss lift warning")
	quit(0)
