extends Node2D

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

# Background plates get their own canvas item so their edge treatment does not
# sharpen the courier, enemies, UI, floor effects or generated debris.
func _draw() -> void:
	var game = get_parent()
	if not game.started or game.layout.is_empty():
		return
	var layout: Dictionary = game.layout
	var scale_factor: float = game.scale_factor
	var art: Texture2D = game.textures.get(layout["art"])
	if art == null:
		return
	if layout.has("parts"):
		var panorama_top := 0.0
		if layout.get("uniqueBackground", false):
			for unique_part in layout["parts"]:
				if unique_part.has("uniqueGround"):
					panorama_top = float(game.GROUND) - float(unique_part["uniqueGround"])
					break
		for part in layout["parts"]:
			var part_art: Texture2D = game.textures.get(part.get("art", layout["art"]))
			if part_art == null:
				continue
			var source: Array = part["source"]
			var width: float = float(part["width"]) * scale_factor
			var height: float = float(part.get("height", source[3])) * scale_factor
			var top: float = float(game.GROUND) - float(part["uniqueGround"]) if part.has("uniqueGround") else float(game.GROUND) - float(layout["ground"]) * scale_factor
			var at := Vector2(float(part["x"]) * scale_factor, top)
			var visible_height: float = minf(height, maxf(0.0, float(game.GROUND) - top)) if layout.get("uniqueBackground", false) else height
			var visible_source_height: float = float(source[3]) * visible_height / height
			var ceiling_height: float = maxf(0.0, top - panorama_top) if layout.get("uniqueBackground", false) and not part.has("uniqueGround") else 0.0
			var ceiling_source := Rect2(source[0], source[1], source[2], minf(64.0, float(source[3])))
			if part.get("mirror", false):
				draw_set_transform(Vector2(at.x + width, 0), 0.0, Vector2(-1, 1))
				if ceiling_height > 0.0:
					draw_texture_rect_region(part_art, Rect2(0, panorama_top, width, ceiling_height), ceiling_source)
				draw_texture_rect_region(part_art, Rect2(0, at.y, width, visible_height), Rect2(source[0], source[1], source[2], visible_source_height))
				draw_set_transform_matrix(Transform2D.IDENTITY)
			else:
				if ceiling_height > 0.0:
					draw_texture_rect_region(part_art, Rect2(at.x, panorama_top, width, ceiling_height), ceiling_source)
				draw_texture_rect_region(part_art, Rect2(at.x, at.y, width, visible_height), Rect2(source[0], source[1], source[2], visible_source_height))
	else:
		var crop: Array = layout["crop"]
		var dest := Rect2(0, game.GROUND - float(layout["ground"]) * scale_factor, float(crop[2]) * scale_factor, float(crop[3]) * scale_factor)
		if layout.get("mirror", false):
			draw_set_transform(Vector2(dest.size.x, 0), 0.0, Vector2(-1, 1))
			draw_texture_rect_region(art, dest, Rect2(crop[0], crop[1], crop[2], crop[3]))
			draw_set_transform_matrix(Transform2D.IDENTITY)
		else:
			draw_texture_rect_region(art, dest, Rect2(crop[0], crop[1], crop[2], crop[3]))
	if layout.get("doorOverlay", false):
		draw_continuous_doors(game, layout, scale_factor)

func draw_continuous_doors(game: Node, layout: Dictionary, scale_factor: float) -> void:
	var doors_atlas: Texture2D = game.textures.get("doors")
	if doors_atlas != null:
		for door in layout.get("doors", []):
			var rect: Array = door["rect"]
			var x := (float(rect[0]) + float(rect[2]) * 0.5) * scale_factor
			var source := Rect2(200, 42, 320, 560)
			match str(door.get("kind", "")):
				"infirmary": source = Rect2(200, 650, 320, 555)
				"technical": source = Rect2(735, 650, 320, 555)
				"office": source = Rect2(735, 42, 320, 560)
			if str(layout.get("zone", "")) in ["parking", "bunker"]:
				source = Rect2(735, 650, 320, 555)
			var frame := Rect2(x - 52.0, float(game.GROUND) - 178.0, 104.0, 180.0)
			draw_texture_rect_region(doors_atlas, frame, source)
	var lift_texture: Texture2D = game.textures.get("lift_door")
	if lift_texture != null:
		var lift_rect: Array = layout["lift"]["rect"]
		var lift_x := (float(lift_rect[0]) + float(lift_rect[2]) * 0.5) * scale_factor
		draw_texture_rect_region(lift_texture, Rect2(lift_x - 78.0, float(game.GROUND) - 184.0, 156.0, 186.0), Rect2(0, 0, lift_texture.get_width(), lift_texture.get_height()))
