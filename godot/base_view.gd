class_name LiftBaseView
extends Control

signal exit_requested
signal new_run_requested

const ROOM_DESCRIPTIONS := {
	"workbench": "Ремонт и изготовление идут быстрее. Каждый ранг сокращает время работы на 10%.",
	"medical": "Медикаменты восстанавливают на 10% больше здоровья за ранг.",
	"storage": "Увеличивает число ячеек склада и позволяет готовить припасы к спуску.",
	"radio": "Показывает сигнал, затем личность, точную комнату и нужные припасы по мере улучшения.",
	"turret": "Защищает убежище во время ночных атак. Охранник усиливает оборону.",
	"generator": "Даёт топливо и понемногу ДНК, пока вы отсутствуете.",
	"farm": "Выращивает пищу и очищает воду для жителей убежища.",
	"armory": "Выдаёт дополнительные патроны перед новым спуском.",
	"laboratory": "Готовит противоядия для следующего спуска.",
	"command": "Координирует оборону убежища: каждый ранг добавляет 150 к защите."
}

var base: LiftBase
var catalog: Dictionary
var selected_room := "workbench"
var selected_supply := ""
var room_buttons: Dictionary = {}
var room_shades: Dictionary = {}
var room_rank_marks: Dictionary = {}
var occupant_nodes: Dictionary = {}
var preset_buttons: Dictionary = {}
var idle_clock := 0.0
var title_label: Label
var stats_label: Label
var room_label: Label
var room_level_label: Label
var detail_label: Label
var preview_image: TextureRect
var upgrade_button: Button
var level_button: Button
var supply_list: ItemList
var prepare_button: Button
var return_button: Button
var notice_label: Label
var wave_label: Label
var people_button: Button
var tasks_button: Button
var info_panel: ColorRect
var info_label: Label
var info_mode := ""

func setup(store: LiftBase, data: Dictionary) -> void:
	base = store
	catalog = data
	build_view()
	refresh()

func make_label(parent: Node, at: Rect2, content: String, font_size: int, tint: Color) -> Label:
	var label := Label.new()
	label.position = at.position
	label.size = at.size
	label.text = content
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", tint)
	parent.add_child(label)
	return label

func make_button(parent: Node, at: Rect2, content: String, callback: Callable) -> Button:
	var button := Button.new()
	button.position = at.position
	button.size = at.size
	button.text = content
	button.add_theme_font_size_override("font_size", 15)
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color("#1b2c2ee8")
	normal.border_color = Color("#ae9462")
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(9)
	button.add_theme_stylebox_override("normal", normal)
	var hover := normal.duplicate()
	hover.bg_color = Color("#3b4938")
	hover.border_color = Color("#e5bc75")
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", Color("#efe3c9"))
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.pressed.connect(callback)
	parent.add_child(button)
	return button

func build_view() -> void:
	var background := ColorRect.new()
	background.color = Color("#071115")
	background.size = Vector2(1280, 720)
	add_child(background)
	var art := TextureRect.new()
	art.texture = load("res://assets/base_backdrop.png")
	art.position = Vector2(0, 76)
	art.size = Vector2(960, 550)
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_SCALE
	add_child(art)
	# TextureRect recalculates its minimum size on entry; pin the cutaway to
	# the interaction grid after it joins the tree.
	art.size = Vector2(960, 550)
	var header := ColorRect.new()
	header.color = Color("#071619f5")
	header.size = Vector2(1280, 76)
	add_child(header)
	title_label = make_label(self, Rect2(26, 15, 420, 52), "УБЕЖИЩЕ · БАШНЯ", 31, Color("#f1dfb7"))
	stats_label = make_label(self, Rect2(650, 12, 525, 58), "", 15, Color("#ead7ad"))
	var footer := ColorRect.new()
	footer.color = Color("#07191cf5")
	footer.position = Vector2(0, 626)
	footer.size = Vector2(1280, 94)
	add_child(footer)
	make_button(self, Rect2(1190, 16, 72, 42), "МЕНЮ", func() -> void: exit_requested.emit()).add_theme_font_size_override("font_size", 12)
	wave_label = make_label(self, Rect2(24, 634, 360, 26), "", 12, Color("#a7bbac"))
	notice_label = make_label(self, Rect2(398, 633, 490, 29), "", 13, Color("#e9c27e"))
	people_button = make_button(self, Rect2(20, 669, 157, 40), "ОБИТАТЕЛИ", show_people)
	tasks_button = make_button(self, Rect2(186, 669, 154, 40), "ЗАДАНИЯ", show_tasks)
	for index in 3:
		var id: String = ["assault", "quiet", "heavy"][index]
		var button := make_button(self, Rect2(385 + index * 138, 672, 130, 34), LiftBase.PRESETS[id]["name"], func() -> void: apply_preset(id))
		button.add_theme_font_size_override("font_size", 12)
		preset_buttons[id] = button
	var descent := make_button(self, Rect2(910, 656, 350, 54), "ПОДГОТОВИТЬСЯ К СПУСКУ  →", func() -> void: new_run_requested.emit())
	var gold := StyleBoxFlat.new()
	gold.bg_color = Color("#d99a32")
	gold.border_color = Color("#f3c267")
	gold.set_border_width_all(2)
	gold.set_corner_radius_all(9)
	descent.add_theme_stylebox_override("normal", gold)
	descent.add_theme_color_override("font_color", Color("#172020"))
	descent.add_theme_font_size_override("font_size", 18)
	for index in LiftBase.ROOM_ORDER.size():
		var id: String = LiftBase.ROOM_ORDER[index]
		var column := index % 5
		var row := index / 5
		var shade := ColorRect.new()
		shade.position = Vector2(column * 192.0 + 3.0, 167.0 if row == 0 else 366.0)
		shade.size = Vector2(186.0, 178.0)
		shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(shade)
		room_shades[id] = shade
		var button_y := 307.0 if row == 0 else 505.0
		var button := make_button(self, Rect2(column * 192.0 + 8, button_y, 176, 37), LiftBase.ROOM_NAMES[id], func() -> void: select_room(id))
		button.modulate.a = 0.94
		room_buttons[id] = button
		var marks: Array[ColorRect] = []
		for mark_index in 5:
			var mark := ColorRect.new()
			mark.position = Vector2(column * 192.0 + 24.0 + mark_index * 30.0, button_y + 39.0)
			mark.size = Vector2(23.0, 3.0)
			mark.mouse_filter = Control.MOUSE_FILTER_IGNORE
			add_child(mark)
			marks.append(mark)
		room_rank_marks[id] = marks
	build_occupants()
	var sidebar := ColorRect.new()
	sidebar.color = Color("#0b1c1ef5")
	sidebar.position = Vector2(960, 76)
	sidebar.size = Vector2(320, 550)
	add_child(sidebar)
	room_label = make_label(self, Rect2(982, 96, 276, 48), "", 25, Color("#f1ddb1"))
	room_level_label = make_label(self, Rect2(982, 142, 276, 24), "", 15, Color("#d9ab5e"))
	var rule := ColorRect.new()
	rule.position = Vector2(982, 169)
	rule.size = Vector2(276, 1)
	rule.color = Color("#a77c3e")
	add_child(rule)
	detail_label = make_label(self, Rect2(982, 183, 276, 85), "", 15, Color("#d6ded3"))
	detail_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	upgrade_button = make_button(self, Rect2(982, 272, 276, 41), "", upgrade_selected)
	level_button = make_button(self, Rect2(982, 319, 276, 35), "", upgrade_base)
	level_button.add_theme_font_size_override("font_size", 12)
	preview_image = TextureRect.new()
	preview_image.position = Vector2(982, 364)
	preview_image.size = Vector2(276, 107)
	preview_image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	preview_image.stretch_mode = TextureRect.STRETCH_SCALE
	preview_image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(preview_image)
	make_label(self, Rect2(982, 480, 276, 26), "СКЛАД · ПРИПАСЫ К СПУСКУ", 14, Color("#e8c386"))
	supply_list = ItemList.new()
	supply_list.position = Vector2(982, 506)
	supply_list.size = Vector2(276, 68)
	supply_list.add_theme_color_override("font_color", Color("#e8e3d3"))
	supply_list.item_selected.connect(func(index: int) -> void:
		selected_supply = str(supply_list.get_item_metadata(index))
		refresh_supply_buttons())
	add_child(supply_list)
	prepare_button = make_button(self, Rect2(982, 582, 132, 35), "ВЗЯТЬ +1", prepare_selected)
	return_button = make_button(self, Rect2(1123, 582, 135, 35), "ВЕРНУТЬ", return_selected)
	info_panel = ColorRect.new()
	info_panel.position = Vector2(28, 162)
	info_panel.size = Vector2(412, 252)
	info_panel.color = Color("#0b191ceF")
	info_panel.visible = false
	add_child(info_panel)
	info_label = make_label(info_panel, Rect2(24, 22, 364, 202), "", 17, Color("#e9dbc0"))
	info_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

func build_occupants() -> void:
	var people: Texture2D = load("res://assets/survivor_idle.png")
	var cell := Vector2i(people.get_width() / 4, people.get_height() / 2)
	var positions := {
		"engineer": Vector2(96, 301), "medic": Vector2(287, 301),
		"trader": Vector2(478, 301), "child": Vector2(675, 301),
		"guard": Vector2(864, 301), "cook": Vector2(284, 500),
		"dog": Vector2(350, 501)
	}
	var people_frames := {"medic": 0, "trader": 1, "engineer": 2, "child": 3, "guard": 4}
	for id in positions:
		var occupant := TextureRect.new()
		if id == "cook" or id == "dog":
			occupant.texture = load("res://assets/survivor_%s.png" % id)
		else:
			var index := int(people_frames[id])
			var atlas := AtlasTexture.new()
			atlas.atlas = people
			atlas.region = Rect2i((index % 4) * cell.x, (index / 4) * cell.y, cell.x, cell.y)
			occupant.texture = atlas
		var extent := Vector2(80, 64) if id == "dog" else (Vector2(65, 77) if id == "child" else Vector2(72, 93))
		occupant.position = positions[id] - Vector2(extent.x * 0.5, extent.y)
		occupant.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		occupant.stretch_mode = TextureRect.STRETCH_SCALE
		occupant.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(occupant)
		occupant.size = extent
		occupant.pivot_offset = Vector2(extent.x * 0.5, extent.y)
		occupant.visible = false
		occupant_nodes[id] = occupant

func _process(delta: float) -> void:
	if not visible or occupant_nodes.is_empty():
		return
	idle_clock += delta
	var index := 0
	for id in occupant_nodes:
		var occupant: TextureRect = occupant_nodes[id]
		if occupant.visible:
			var phase := idle_clock * 1.5 + index * 1.13
			occupant.rotation = sin(phase * 0.73) * 0.004
			occupant.scale = Vector2(1.0, 1.0 + sin(phase) * 0.007)
		index += 1

func show_base() -> void:
	var old_waves := int(base.state()["waves"])
	base.sync_time(Time.get_unix_time_from_system())
	if int(base.state()["waves"]) > old_waves:
		var report := base.last_wave()
		notice_label.text = "НОЧНАЯ АТАКА ОТБИТА" if bool(report.get("defended", false)) else "НОЧНАЯ АТАКА: ПОТЕРЯНО 10% РЕСУРСОВ"
	visible = true
	refresh()

func select_room(id: String) -> void:
	selected_room = id
	info_mode = ""
	info_panel.visible = false
	refresh()

func show_people() -> void:
	info_mode = "" if info_mode == "people" else "people"
	info_panel.visible = info_mode != ""
	refresh_info()

func show_tasks() -> void:
	info_mode = "" if info_mode == "tasks" else "tasks"
	info_panel.visible = info_mode != ""
	refresh_info()

func refresh_info() -> void:
	if info_mode == "people":
		var names: Array[String] = []
		for id in base.state()["npcs"]:
			names.append(str(LiftBase.NPC_NAMES.get(id, id)))
		info_label.text = "ОБИТАТЕЛИ УБЕЖИЩА\n\n" + ("Пока никого не нашли. Ищите выживших во время спуска: после спасения они появятся здесь и в комнатах базы." if names.is_empty() else " · ".join(names))
	elif info_mode == "tasks":
		info_label.text = "ЗАДАНИЯ\n\nИсследуйте этажи башни, находите выживших и доставляйте припасы в убежище. Улучшайте комнаты перед следующим спуском."

func upgrade_selected() -> void:
	if base.upgrade_room(selected_room):
		notice_label.text = "УЛУЧШЕНИЕ ГОТОВО"
	else:
		notice_label.text = "НЕДОСТАТОЧНО ДНК ИЛИ КОМНАТА ЗАКРЫТА"
	refresh()

func upgrade_base() -> void:
	if base.upgrade_level():
		notice_label.text = "УБЕЖИЩЕ РАСШИРЕНО"
	else:
		notice_label.text = "НЕ ХВАТАЕТ ДНК"
	refresh()

func prepare_selected() -> void:
	if selected_supply == "":
		return
	if base.prepare_supply(selected_supply, 1):
		notice_label.text = "ПРИПАС ДОБАВЛЕН К СНАРЯЖЕНИЮ"
	else:
		notice_label.text = "МЕСТО ДЛЯ СНАРЯЖЕНИЯ ЗАНЯТО"
	refresh()

func return_selected() -> void:
	if selected_supply != "" and base.return_prepared(selected_supply):
		notice_label.text = "ПРИПАСЫ ВЕРНУЛИСЬ НА СКЛАД"
	refresh()

func apply_preset(id: String) -> void:
	if base.apply_preset(id):
		notice_label.text = "НАБОР «%s» ГОТОВ К СПУСКУ" % LiftBase.PRESETS[id]["name"]
	else:
		notice_label.text = "НЕ ХВАТАЕТ ПРИПАСОВ ДЛЯ НАБОРА"
	refresh()

func refresh_supply_buttons() -> void:
	prepare_button.disabled = selected_supply == "" or int(base.state()["stash"].get(selected_supply, 0)) <= 0
	return_button.disabled = selected_supply == "" or not base.state()["prepared"].has(selected_supply)

func refresh() -> void:
	if base == null:
		return
	var state := base.state()
	var rooms: Dictionary = state["rooms"]
	var resources: Dictionary = state["resources"]
	var level := int(state["level"])
	stats_label.text = "ДНК %d   ·   ТОПЛИВО %d   ·   НАСТРОЙ %d%%\nБАЗА %d   ·   ЕДА %d   ·   ВОДА %d" % [int(base.progression.profile["dna"]), int(resources["fuel"]), int(base.progression.profile["morale"]), level, int(resources["food"]), int(resources["water"])]
	wave_label.text = "ОБОРОНА %d / УГРОЗА %d · АТАКИ %d" % [base.wave_defense(), base.wave_threat(), int(state["waves"])]
	for id in preset_buttons:
		preset_buttons[id].disabled = not base.can_apply_preset(id)
	var rank := int(rooms[selected_room])
	var unlock := int(LiftBase.ROOM_UNLOCK[selected_room])
	room_label.text = LiftBase.ROOM_NAMES[selected_room]
	room_level_label.text = "УРОВЕНЬ %d / 5" % rank
	detail_label.text = "ОТКРОЕТСЯ НА УРОВНЕ %d\n%s" % [unlock, ROOM_DESCRIPTIONS[selected_room]] if level < unlock else ROOM_DESCRIPTIONS[selected_room]
	var room_index: int = LiftBase.ROOM_ORDER.find(selected_room)
	var preview_atlas := AtlasTexture.new()
	preview_atlas.atlas = load("res://assets/base_backdrop.png")
	preview_atlas.region = Rect2((room_index % 5) * 334, 270 + (room_index / 5) * 300, 334, 130)
	preview_image.texture = preview_atlas
	var cost := base.room_cost(selected_room)
	upgrade_button.text = "УЛУЧШИТЬ · %d ДНК" % cost if cost > 0 else ("МАКСИМАЛЬНЫЙ РАНГ" if rank >= 5 else "КОМНАТА ЗАКРЫТА")
	upgrade_button.disabled = cost <= 0 or int(base.progression.profile["dna"]) < cost
	var level_cost := base.level_cost()
	level_button.text = "РАСШИРИТЬ БАЗУ · %d ДНК" % level_cost if level_cost > 0 else "БАЗА МАКСИМАЛЬНА"
	level_button.disabled = level_cost <= 0 or int(base.progression.profile["dna"]) < level_cost
	for id in room_buttons:
		var button: Button = room_buttons[id]
		var unlocked := level >= int(LiftBase.ROOM_UNLOCK[id])
		button.text = "%s %d/5" % [LiftBase.ROOM_NAMES[id], int(rooms[id])] if unlocked else "🔒 %s" % LiftBase.ROOM_NAMES[id]
		button.modulate = Color.WHITE if id == selected_room else Color(0.82, 0.85, 0.83, 0.82)
		room_shades[id].color = Color(0.01, 0.02, 0.025, 0.48) if not unlocked else Color(0.9, 0.73, 0.4, minf(0.06, int(rooms[id]) * 0.012))
		for mark_index in 5:
			var mark: ColorRect = room_rank_marks[id][mark_index]
			mark.color = Color("#d7aa62") if mark_index < int(rooms[id]) else Color("#344044")
	for id in occupant_nodes:
		occupant_nodes[id].visible = base.has_npc(id)
	refresh_info()
	supply_list.clear()
	for id in state["stash"]:
		var amount := int(state["stash"][id])
		var ready := int(state["prepared"].get(id, 0))
		var label := "%s ×%d" % [catalog["items"].get(id, {}).get("name", id), amount]
		if ready > 0:
			label += "   [ВЗЯТО: %d]" % ready
		supply_list.add_item(label)
		var index := supply_list.item_count - 1
		supply_list.set_item_metadata(index, id)
	for id in state["prepared"]:
		if not state["stash"].has(id):
			supply_list.add_item("%s   [ВЗЯТО: %d]" % [catalog["items"].get(id, {}).get("name", id), int(state["prepared"][id])])
			var index := supply_list.item_count - 1
			supply_list.set_item_metadata(index, id)
	refresh_supply_buttons()
