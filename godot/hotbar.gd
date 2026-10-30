class_name LiftHotbar
extends Control

var store: LiftInventory
var view: LiftInventoryView
var selected := 0
var key_style: StyleBoxFlat

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	key_style = StyleBoxFlat.new()
	key_style.bg_color = Color("#263530")
	key_style.border_color = Color("#ad9160")
	key_style.set_border_width_all(1)
	key_style.set_corner_radius_all(3)

func _draw() -> void:
	if store == null or view == null:
		return
	var start := Vector2(455, 627)
	draw_rect(Rect2(start - Vector2(13, 10), Vector2(370, 81)), Color("#101d20cc"), true)
	for index in 4:
		var type: String = view.quick_slots[index]
		var rect := Rect2(start + Vector2(index * 90, 0), Vector2(78, 62))
		draw_rect(rect, Color("#253631e8"), true)
		draw_rect(rect, Color("#dcaf65") if index == selected else Color("#617c76"), false, 2.0)
		var info: Dictionary = view.catalog.get("items", {}).get(type, {})
		var sheet: String = info.get("sheet", "loot")
		if int(info.get("icon", -1)) < 0:
			sheet = "gear"
		var texture: Texture2D = view.icons.get(sheet)
		if texture != null:
			var columns := int(info.get("sheetColumns", 2 if info.has("sheet") or int(info.get("icon", 0)) < 0 else 4))
			var rows := int(info.get("sheetRows", columns))
			var icon_index := maxi(0, int(info.get("icon", 0)))
			var source := Rect2((icon_index % columns) * texture.get_width() / float(columns), (icon_index / columns) * texture.get_height() / float(rows), texture.get_width() / float(columns), texture.get_height() / float(rows))
			draw_texture_rect_region(texture, Rect2(rect.position + Vector2(21, 7), Vector2(37, 37)), source)
		var amount := store.total(type)
		var count := "F" if type == "flashlight" else ("∞" if type == "knife" and amount > 0 else str(amount))
		draw_string(ThemeDB.fallback_font, rect.position + Vector2(60, 46), count, HORIZONTAL_ALIGNMENT_RIGHT, 14, 13, Color("#f3dfad"))
		draw_style_box(key_style, Rect2(rect.position + Vector2(5, 43), Vector2(21, 16)))
		draw_string(ThemeDB.fallback_font, rect.position + Vector2(11, 56), str(index + 1), HORIZONTAL_ALIGNMENT_LEFT, 14, 12, Color("#f4d693"))
