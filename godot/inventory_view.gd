class_name LiftInventoryView
extends Control

signal use_requested(uid: String)
signal drop_requested(uid: String)
signal equip_requested(uid: String)
signal craft_requested(recipe_id: String)
signal attachment_requested(uid: String)
signal quick_requested(index: int, type: String)

const CELL := 54.0
const GRID_ORIGIN := Vector2(254, 172)
const PANEL := Rect2(174, 76, 932, 568)
const ACTIONS := ["ИСПОЛЬЗОВАТЬ", "НАДЕТЬ", "ПОВЕРНУТЬ", "ОБЪЕДИНИТЬ", "ВЫБРОСИТЬ"]

var store: LiftInventory
var catalog: Dictionary = {}
var icons: Dictionary = {}
var selected_uid := ""
var shown := false
var dna := 0
var quick_slots := ["grenade", "medkit", "flashlight", "knife"]
var recipe_offset := 0
var notice := ""
var dragging_uid := ""
var drag_origin := Vector2.ZERO
var drag_pointer := Vector2.ZERO
var drag_active := false

func _ready() -> void:
	for name in ["loot", "medical_items", "armor_items", "backpacks", "attachments", "gear", "weapon_icons", "ammo_variants"]:
		icons[name] = load("res://assets/%s.png" % name)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func open_bag() -> void:
	shown = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	queue_redraw()

func close_bag() -> void:
	shown = false
	dragging_uid = ""
	drag_active = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if not shown or store == null:
		return
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			recipe_offset += 1
			queue_redraw()
			return
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			recipe_offset = maxi(0, recipe_offset - 1)
			queue_redraw()
			return
		if event.button_index == MOUSE_BUTTON_LEFT:
			handle_click(event.position)
			var cell := Vector2i(floori((event.position.x - GRID_ORIGIN.x) / CELL), floori((event.position.y - GRID_ORIGIN.y) / CELL))
			if cell.x >= 0 and cell.y >= 0 and cell.x < int(store.grid()["columns"]) and cell.y < int(store.grid()["rows"]):
				var picked := store.item_at(cell.x, cell.y)
				if not picked.is_empty():
					dragging_uid = picked["uid"]
					drag_origin = event.position
					drag_pointer = event.position
					drag_active = false
			accept_event()
	elif event is InputEventMouseMotion and dragging_uid != "":
		drag_pointer = event.position
		if drag_pointer.distance_to(drag_origin) > 8.0:
			drag_active = true
		queue_redraw()
	elif event is InputEventMouseButton and not event.pressed and event.button_index == MOUSE_BUTTON_LEFT and dragging_uid != "":
		finish_drag(event.position)
		accept_event()

func finish_drag(point: Vector2) -> void:
	if drag_active:
		var item := store.find_item(dragging_uid)
		var slot := -1
		for index in 4:
			if Rect2(440 + index * 92, 582, 82, 48).has_point(point):
				slot = index
		if slot >= 0 and not item.is_empty():
			assign_quick_slot(slot, item["type"])
			notice = "БЫСТРЫЙ СЛОТ %d НАЗНАЧЕН" % (slot + 1)
		else:
			var cell := Vector2i(floori((point.x - GRID_ORIGIN.x) / CELL), floori((point.y - GRID_ORIGIN.y) / CELL))
			if store.move_item(dragging_uid, cell.x, cell.y):
				notice = "ПРЕДМЕТ ПЕРЕМЕЩЁН"
			else:
				notice = "НЕТ МЕСТА ДЛЯ ПРЕДМЕТА"
	dragging_uid = ""
	drag_active = false
	queue_redraw()

func handle_click(point: Vector2) -> void:
	if point.x >= GRID_ORIGIN.x and point.y >= GRID_ORIGIN.y:
		var cell := Vector2i(floori((point.x - GRID_ORIGIN.x) / CELL), floori((point.y - GRID_ORIGIN.y) / CELL))
		if cell.x >= 0 and cell.y >= 0 and cell.x < int(store.grid()["columns"]) and cell.y < int(store.grid()["rows"]):
			var picked := store.item_at(cell.x, cell.y)
			if not picked.is_empty():
				selected_uid = picked["uid"]
			elif selected_uid != "" and store.move_item(selected_uid, cell.x, cell.y):
				notice = "ПРЕДМЕТ ПЕРЕМЕЩЁН"
			queue_redraw()
			return
	for index in ACTIONS.size():
		if Rect2(741, 198 + index * 48, 302, 41).has_point(point):
			perform_action(index)
			return
	if Rect2(741, 438, 302, 30).has_point(point):
		if selected_uid != "":
			attachment_requested.emit(selected_uid)
			queue_redraw()
		return
	if Rect2(741, 474, 302, 154).has_point(point):
		var recipes: Array = catalog.get("recipes", {}).keys()
		var index := recipe_offset + floori((point.y - 482) / 29.0)
		if index >= 0 and index < recipes.size():
			craft_requested.emit(recipes[index])
			queue_redraw()
		return
	for index in 4:
		if Rect2(440 + index * 92, 582, 82, 48).has_point(point):
			var item := store.find_item(selected_uid)
			if not item.is_empty():
				assign_quick_slot(index, item["type"])
				queue_redraw()
			return

func assign_quick_slot(index: int, type: String) -> void:
	if index < 0 or index >= quick_slots.size():
		return
	var old := quick_slots.find(type)
	if old >= 0 and old != index:
		quick_slots[old] = quick_slots[index]
	quick_slots[index] = type
	quick_requested.emit(index, type)

func perform_action(index: int) -> void:
	if selected_uid == "":
		return
	match index:
		0: use_requested.emit(selected_uid)
		1: equip_requested.emit(selected_uid)
		2:
			if store.rotate_item(selected_uid):
				notice = "ПРЕДМЕТ ПОВЁРНУТ"
			else:
				notice = "НЕТ МЕСТА ДЛЯ ПОВОРОТА"
		3:
			if store.combine(selected_uid):
				notice = "ПРЕДМЕТЫ ОБЪЕДИНЕНЫ"
				selected_uid = ""
			else:
				notice = "НЕЧЕГО ОБЪЕДИНЯТЬ"
		4:
			drop_requested.emit(selected_uid)
	queue_redraw()

func draw_text(copy: String, point: Vector2, color := Color("#d5d9cd"), size := 16) -> void:
	draw_string(ThemeDB.fallback_font, point, copy, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)

func panel_style(fill: Color, outline: Color, radius := 12) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = fill
	box.border_color = outline
	box.set_border_width_all(1)
	box.set_corner_radius_all(radius)
	return box

func item_icon(item: Dictionary, rect: Rect2) -> void:
	var info: Dictionary = catalog["items"].get(item["type"], {})
	if info.is_empty():
		return
	var sheet: String = info.get("sheet", "loot")
	if int(info.get("icon", -1)) < 0:
		sheet = "gear"
	var texture: Texture2D = icons.get(sheet)
	if texture == null:
		return
	var columns := int(info.get("sheetColumns", 2 if info.has("sheet") or int(info.get("icon", 0)) < 0 else 4))
	var rows := int(info.get("sheetRows", columns))
	var index := maxi(0, int(info.get("icon", 0)))
	var source := Rect2((index % columns) * texture.get_width() / float(columns), (index / columns) * texture.get_height() / float(rows), texture.get_width() / float(columns), texture.get_height() / float(rows))
	draw_texture_rect_region(texture, rect, source)

func _draw() -> void:
	if not shown or store == null or catalog.is_empty():
		return
	draw_rect(Rect2(0, 0, 1280, 720), Color(0.015, 0.025, 0.032, 0.88))
	draw_style_box(panel_style(Color("#142022"), Color("#9b855d"), 19), PANEL)
	draw_text("РЮКЗАК · %s" % store.grid()["name"], Vector2(218, 126), Color("#e5d6b1"), 27)
	draw_text("ВЕС %.1f / %.1f КГ     ДНК %d" % [store.equipped_weight(), store.weight_limit(), dna], Vector2(745, 128), Color("#b7c8c4"), 16)
	var cols := int(store.grid()["columns"])
	var rows := int(store.grid()["rows"])
	for y in rows:
		for x in cols:
			var rect := Rect2(GRID_ORIGIN + Vector2(x, y) * CELL, Vector2(CELL - 3, CELL - 3))
			draw_style_box(panel_style(Color("#202d2e"), Color("#485650"), 5), rect)
	for item in store.items:
		var size := store.dimensions(item, bool(item.get("rotated", false)))
		var rect := Rect2(GRID_ORIGIN + Vector2(int(item["x"]), int(item["y"])) * CELL, Vector2(size.x, size.y) * CELL - Vector2(3, 3))
		draw_style_box(panel_style(Color("#324139"), Color("#dab56e") if item["uid"] == selected_uid else Color("#617269"), 7), rect)
		var icon_rect := Rect2(rect.position + Vector2(4, 4), Vector2(minf(rect.size.x - 8, 48), minf(rect.size.y - 8, 48)))
		item_icon(item, icon_rect)
		if int(item["qty"]) > 1:
			draw_text(str(item["qty"]), rect.position + Vector2(rect.size.x - 25, rect.size.y - 7), Color("#f1d38e"), 14)
	var selected := store.find_item(selected_uid)
	if not selected.is_empty():
		var info := store.definition(selected["type"])
		draw_text(info.get("name", selected["type"]), Vector2(744, 171), Color("#f1d38e"), 19)
		draw_text(info.get("description", "").substr(0, 64), Vector2(744, 190), Color("#9caaa5"), 12)
	for index in ACTIONS.size():
		var rect := Rect2(741, 198 + index * 48, 302, 41)
		draw_style_box(panel_style(Color("#26362f"), Color("#6e7c64"), 8), rect)
		draw_text(ACTIONS[index], rect.position + Vector2(14, 27), Color("#e0dbc8"), 15)
	var attachment_text := "УСТАНОВИТЬ / СНЯТЬ ОБВЕС"
	if not selected.is_empty():
		attachment_text = "УСТАНОВИТЬ ОБВЕС" if store.definition(selected["type"]).get("group") == "attachment" else "СНЯТЬ ОБВЕС"
	draw_style_box(panel_style(Color("#2d3830"), Color("#967b53"), 7), Rect2(741, 438, 302, 30))
	draw_text(attachment_text, Vector2(755, 458), Color("#e4d5b3"), 13)
	draw_text("ВЕРСТАК · ИЗГОТОВЛЕНИЕ", Vector2(746, 467), Color("#dbbf83"), 15)
	var recipes: Array = catalog["recipes"].keys()
	for index in 5:
		var at := recipe_offset + index
		if at >= recipes.size():
			break
		var recipe: Dictionary = catalog["recipes"][recipes[at]]
		draw_text("%s · %s" % [recipe["name"], str(recipe.get("ingredients", {}))], Vector2(750, 500 + index * 29), Color("#adbbb1"), 12)
	draw_text(notice, Vector2(259, 560), Color("#e0be7c"), 14)
	for index in 4:
		var rect := Rect2(440 + index * 92, 582, 82, 48)
		draw_style_box(panel_style(Color("#253630"), Color("#9c865d"), 8), rect)
		draw_style_box(panel_style(Color("#263530"), Color("#ad9160"), 3), Rect2(rect.position + Vector2(6, 14), Vector2(21, 19)))
		draw_text(str(index + 1), rect.position + Vector2(12, 29), Color("#f4d693"), 13)
		draw_text(quick_slots[index].substr(0, 5), rect.position + Vector2(32, 29), Color("#eddbb5"), 13)
	if drag_active:
		var moving := store.find_item(dragging_uid)
		if not moving.is_empty():
			draw_rect(Rect2(drag_pointer - Vector2(28, 28), Vector2(56, 56)), Color("#b39b6577"))
			item_icon(moving, Rect2(drag_pointer - Vector2(24, 24), Vector2(48, 48)))
