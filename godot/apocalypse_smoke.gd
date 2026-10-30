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
	var scenes := 0
	var props := 0
	var caches := 0
	for floor_key in game.maps:
		var floor: Dictionary = game.maps[floor_key]
		for scene in [floor] + floor["rooms"].values():
			scenes += 1
			var placed: Array = game.apocalypse_layouts.get(scene["id"], [])
			var variants: Dictionary = {}
			if not require(not placed.is_empty(), "%s receives generated disaster debris" % scene["id"]):
				return
			var scale := float(scene["width"]) / float(scene["crop"][2])
			for prop in placed:
				props += 1
				var key := "%s_%s" % [prop["zone"], prop["sheet"]]
				var variant := "%s:%d" % [key, int(prop["index"])]
				if not require(not variants.has(variant), "%s does not repeat a debris model" % scene["id"]):
					return
				variants[variant] = true
				if str(prop["zone"]) == "office" and not scene.get("continuousBackground", false):
					if not require(not (str(prop["sheet"]) == "a" and int(prop["index"]) == 0), "painted office desk is not duplicated at miniature scale"):
						return
				var atlas: Texture2D = game.textures.get("apocalypse_%s" % key)
				var cells: Array = game.apocalypse_cells.get(key, [])
				if not require(atlas != null and cells.size() == 4, "%s atlas has four measured cutouts" % key):
					return
				var source: Array = cells[int(prop["index"])]
				var width := float(prop["width"])
				var height := width * float(source[3]) / float(source[2])
				var x := float(prop["x"])
				if not require(width >= 40.0 and width < 140.0 and height > 0.0 and height <= 92.0 and x - width * 0.5 >= 0.0 and x + width * 0.5 <= float(scene["width"]), "%s pile is smaller than the courier and inside the floor" % scene["id"]):
					return
				var openings: Array = scene.get("doors", []).duplicate()
				if scene.has("lift"):
					openings.append(scene["lift"])
				if scene.has("exit"):
					openings.append(scene["exit"])
				for opening in openings:
					var rect: Array = opening["rect"]
					var left := float(rect[0]) * scale - 34.0
					var right := (float(rect[0]) + float(rect[2])) * scale + 34.0
					if not require(x + width * 0.5 < left or x - width * 0.5 > right, "%s debris leaves its door or lift usable" % scene["id"]):
						return
		var cache: Dictionary = {}
		for container in floor["containers"]:
			if str(container["id"]).begins_with("salvage-"):
				cache = container
				break
		if not require(not cache.is_empty(), "floor %s has a searchable generated pile" % floor_key):
			return
		var center := (float(cache["rect"][0]) + float(cache["rect"][2]) * 0.5) * (float(floor["width"]) / float(floor["crop"][2]))
		if not require(game.apocalypse_layouts[floor["id"]].any(func(prop: Dictionary) -> bool: return absf(float(prop["x"]) - center) < 1.0), "floor %s searchable area matches its pictured pile" % floor_key):
			return
		caches += 1
	if not require(scenes >= 224 and props >= 500 and caches == 51, "all tower scenes use proportional apocalypse art"):
		return
	print("PASS: %d proportional generated disaster props in %d scenes, %d searchable caches" % [props, scenes, caches])
	quit(0)
