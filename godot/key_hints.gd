class_name LiftKeyHints
extends Control

# Each entry is KEY|ACTION; entries are separated by semicolons.
@export var hint_text := ""
@export_enum("Left", "Center", "Right") var hint_alignment := 0
@export var hint_size := 13
@export var framed := false

var key_style: StyleBoxFlat
var frame_style: StyleBoxFlat

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	key_style = StyleBoxFlat.new()
	key_style.bg_color = Color("#263530")
	key_style.border_color = Color("#ad9160")
	key_style.set_border_width_all(1)
	key_style.set_corner_radius_all(5)
	frame_style = StyleBoxFlat.new()
	frame_style.bg_color = Color("#101c1edc")
	frame_style.border_color = Color("#7b7659")
	frame_style.set_border_width_all(1)
	frame_style.set_corner_radius_all(9)
	queue_redraw()

func set_hints(value: String) -> void:
	if hint_text == value:
		return
	hint_text = value
	queue_redraw()

func _draw() -> void:
	if hint_text.is_empty() or key_style == null:
		return
	var font := ThemeDB.fallback_font
	var parts: Array[Dictionary] = []
	var total_width := 0.0
	var gap := 15.0 if hint_size <= 13 else 19.0
	for raw in hint_text.split(";", false):
		var fields := raw.split("|", true, 1)
		var key := fields[0].strip_edges() if fields.size() == 2 else ""
		var action := fields[1].strip_edges() if fields.size() == 2 else raw.strip_edges()
		var key_width: float = maxf(25.0, font.get_string_size(key, HORIZONTAL_ALIGNMENT_LEFT, -1, hint_size).x + 14.0) if not key.is_empty() else 0.0
		var action_width: float = font.get_string_size(action, HORIZONTAL_ALIGNMENT_LEFT, -1, hint_size).x
		var item_width := key_width + (7.0 if not key.is_empty() else 0.0) + action_width
		parts.append({"key": key, "action": action, "key_width": key_width, "width": item_width})
		total_width += item_width
	if parts.is_empty():
		return
	total_width += gap * float(parts.size() - 1)
	var x := 0.0
	if hint_alignment == 1:
		x = (size.x - total_width) * 0.5
	elif hint_alignment == 2:
		x = size.x - total_width
	var key_height := float(hint_size) + 9.0
	var y := (size.y - key_height) * 0.5
	if framed:
		draw_style_box(frame_style, Rect2(x - 15.0, y - 8.0, total_width + 30.0, key_height + 16.0))
	for part in parts:
		var key_width: float = part["key_width"]
		var key: String = part["key"]
		var action: String = part["action"]
		if not key.is_empty():
			draw_style_box(key_style, Rect2(x, y, key_width, key_height))
			draw_string(font, Vector2(x + (key_width - font.get_string_size(key, HORIZONTAL_ALIGNMENT_LEFT, -1, hint_size).x) * 0.5, y + key_height - 6.0), key, HORIZONTAL_ALIGNMENT_LEFT, -1, hint_size, Color("#f2d49a"))
		draw_string(font, Vector2(x + key_width + (7.0 if not key.is_empty() else 0.0), y + key_height - 6.0), action, HORIZONTAL_ALIGNMENT_LEFT, -1, hint_size, Color("#c6d1c7") if not key.is_empty() else Color("#d7a481"))
		x += float(part["width"]) + gap
