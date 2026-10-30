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
	var scene_count := 0
	var prop_count := 0
	for floor in game.maps:
		var floor_layout: Dictionary = game.maps[floor]
		var scenes: Array = [floor_layout]
		scenes.append_array(floor_layout["rooms"].values())
		for scene in scenes:
			scene_count += 1
			var props: Array = game.foreground_layouts.get(scene["id"], [])
			if not require(not props.is_empty(), "scene %s has local debris" % scene["id"]):
				return
			var scale := float(scene["width"]) / float(scene["crop"][2])
			var blocked: Array = scene.get("doors", []).duplicate()
			if scene.has("lift"):
				blocked.append(scene["lift"])
			if scene.has("exit"):
				blocked.append(scene["exit"])
			for prop in props:
				prop_count += 1
				var zone: String = prop["zone"]
				var index := int(prop["index"])
				if not require(game.textures.has("foreground_%s" % zone) and game.foreground_cells.get(zone, []).size() == 10 and index >= 0 and index < 10, "prop %s in %s has a matching atlas cutout" % [index, scene["id"]]):
					return
				var cell: Array = game.foreground_cells[zone][index]
				var perspective := 0.9 + ((float(prop["depth"]) + 20.0) / 58.0) * 0.16
				var visible_width: float = float(cell[2]) / (1536.0 / 5.0) * float(prop["width"]) * perspective
				var visible_height: float = float(cell[3]) / (1536.0 / 5.0) * float(prop["width"]) * perspective
				var x := float(prop["x"])
				if not require(visible_width > 0.0 and visible_width < 100.0 and visible_height > 0.0 and visible_height < 110.0 and x - visible_width * 0.5 >= 0.0 and x + visible_width * 0.5 <= float(scene["width"]), "prop %s in %s stays proportional and inside the scene" % [index, scene["id"]]):
					return
				for entry in blocked:
					var rect: Array = entry["rect"]
					var left := float(rect[0]) * scale - 30.0
					var right := (float(rect[0]) + float(rect[2])) * scale + 30.0
					if not require(x + float(prop["width"]) * 0.5 < left or x - float(prop["width"]) * 0.5 > right, "prop %s in %s leaves door and lift clear" % [index, scene["id"]]):
						return
	if not require(scene_count >= 224 and prop_count >= 1000, "all floors and rooms receive varied props"):
		return
	if not require(game.foreground_layouts["floor-50"] != game.foreground_layouts["floor-49"], "adjacent floors have different placements"):
		return
	print("PASS: %d proportional props across %d scenes, clear of all doors and lifts" % [prop_count, scene_count])
	quit(0)
