class_name LiftStatusCard
extends Control

var game: Variant

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func bar(index: int, title: String, ratio: float, value: String, fill: Color) -> void:
	var y := 35.0 + index * 29.0
	draw_string(ThemeDB.fallback_font, Vector2(15, y), title, HORIZONTAL_ALIGNMENT_LEFT, 155, 12, Color("#ccd5c9"))
	draw_string(ThemeDB.fallback_font, Vector2(170, y), value, HORIZONTAL_ALIGNMENT_RIGHT, 75, 11, Color("#f0dfba"))
	draw_rect(Rect2(15, y + 5, 230, 6), Color("#33413e"))
	draw_rect(Rect2(15, y + 5, 230 * clampf(ratio, 0.0, 1.0), 6), fill)

func _draw() -> void:
	if game == null or game.bag == null:
		return
	var background := StyleBoxFlat.new()
	background.bg_color = Color("#102024dd")
	background.border_color = Color("#867753aa")
	background.set_border_width_all(1)
	background.set_corner_radius_all(12)
	draw_style_box(background, Rect2(0, 0, 260, 183))
	draw_string(ThemeDB.fallback_font, Vector2(15, 22), "СОСТОЯНИЕ КУРЬЕРА", HORIZONTAL_ALIGNMENT_LEFT, 230, 13, Color("#e4ca8f"))
	var max_hp := float(game.progression.effects()["maxHp"])
	bar(0, "ЗДОРОВЬЕ", float(game.health) / max_hp, "%d/%d" % [game.health, int(max_hp)], Color("#aa3f3b"))
	bar(1, "ВЫНОСЛИВОСТЬ", game.stamina / 100.0, "%d%%" % int(game.stamina), Color("#6a9c87"))
	bar(2, "ЗАРАЖЕНИЕ", game.infection / 100.0, "%d%%" % int(game.infection), Color("#98aa52"))
	bar(3, "ШУМ", game.noise_level() / 100.0, str(int(game.noise_level())), Color("#b59b62"))
	bar(4, "ФОНАРЬ", game.battery / 100.0, "%d%%" % int(game.battery), Color("#9cbdc4"))
