extends Node2D

const GROUND := 560.0
const FLOOR_BANDS := {"office": [0, 118, 160], "laboratory": [161, 280, 325], "apartment": [327, 462, 507], "mall": [509, 637, 678], "parking": [680, 820, 859], "bunker": [861, 981, 1024]}

# A dedicated nearest-filtered canvas keeps the long floor crisp without
# applying that filter to the courier and infected sprites.
func _draw() -> void:
	var game = get_parent()
	if not game.started or game.layout.is_empty() or game.layout.get("zone", "") == "roof" or not game.textures.has("floor_surfaces"):
		return
	var zone: String = game.layout.get("zone", "office")
	if zone == "technical":
		zone = "parking"
	elif zone == "infirmary":
		zone = "laboratory"
	var band: Array = FLOOR_BANDS.get(zone, FLOOR_BANDS["office"])
	var surface: Texture2D = game.textures["floor_surfaces"]
	var source_width := float(surface.get_width())
	var tile_width := source_width * 0.75
	var tile_x := 0.0
	while tile_x < game.world_width:
		var segment_width: float = minf(tile_width, game.world_width - tile_x)
		var segment_source: float = source_width * segment_width / tile_width
		draw_texture_rect_region(surface, Rect2(tile_x, GROUND, segment_width, 76.0), Rect2(0.0, float(band[0]), segment_source, float(band[1] - band[0])), Color(0.8, 0.8, 0.8))
		draw_texture_rect_region(surface, Rect2(tile_x, GROUND + 76.0, segment_width, 42.0), Rect2(0.0, float(band[1]), segment_source, float(band[2] - band[1])), Color(0.75, 0.75, 0.75))
		tile_x += tile_width
	# The continuous service fascia replaces exposed ends of individual
	# paintings below the walk plane.
	draw_rect(Rect2(0.0, GROUND + 118.0, game.world_width, 90.0), Color("#0b141a"))
	draw_rect(Rect2(0.0, GROUND + 118.0, game.world_width, 3.0), Color("#37454b"))
	for x in range(0, int(game.world_width), 260):
		draw_rect(Rect2(float(x), GROUND + 121.0, 9.0, 87.0), Color("#1b2930"))
		draw_rect(Rect2(float(x) + 2.0, GROUND + 134.0, 2.0, 2.0), Color("#556269"))
