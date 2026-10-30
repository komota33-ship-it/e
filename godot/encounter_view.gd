class_name LiftEncounterView
extends Control

signal choice_selected(index: int)
signal closed

var event_data: Dictionary
var portrait: TextureRect
var title_label: Label
var story_label: Label
var result_label: Label
var choice_buttons: Array[Button] = []
var leave_button: Button

func _ready() -> void:
	var shade := ColorRect.new()
	shade.color = Color("#061013e9")
	shade.size = Vector2(1280, 720)
	add_child(shade)
	var art := TextureRect.new()
	art.texture = load("res://assets/base_backdrop.png")
	art.position = Vector2(0, 0)
	art.size = Vector2(1280, 720)
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_SCALE
	art.modulate = Color(0.42, 0.48, 0.46, 0.25)
	add_child(art)
	art.size = Vector2(1280, 720)
	var card := ColorRect.new()
	card.color = Color("#172225f4")
	card.position = Vector2(162, 94)
	card.size = Vector2(956, 532)
	add_child(card)
	portrait = TextureRect.new()
	portrait.position = Vector2(188, 124)
	portrait.size = Vector2(286, 330)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	add_child(portrait)
	title_label = label_at(Vector2(514, 129), Vector2(565, 50), "", 29, Color("#e7d9b5"))
	story_label = label_at(Vector2(514, 193), Vector2(565, 125), "", 18, Color("#d9e0d4"))
	story_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	for index in 3:
		var button := Button.new()
		button.position = Vector2(513, 339 + index * 63)
		button.size = Vector2(563, 50)
		button.add_theme_font_size_override("font_size", 16)
		button.pressed.connect(func() -> void: choice_selected.emit(index))
		add_child(button)
		choice_buttons.append(button)
	result_label = label_at(Vector2(188, 557), Vector2(890, 45), "", 16, Color("#e4bf82"))
	result_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

func label_at(at: Vector2, extent: Vector2, value: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.position = at
	label.size = extent
	label.text = value
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	add_child(label)
	return label

func show_event(data: Dictionary, bag: LiftInventory, dna: int, base: LiftBase) -> void:
	event_data = data
	visible = true
	if is_instance_valid(leave_button):
		leave_button.queue_free()
		leave_button = null
	result_label.text = ""
	title_label.text = str(data["name"])
	story_label.text = str(data["story"])
	var index := int(data["portrait"])
	var sheet: Texture2D = load("res://assets/survivor_idle.png") if index < 8 else load("res://assets/survivor_dog.png")
	if index == 8:
		portrait.texture = sheet
	else:
		var columns := 4
		var rows := 2
		var cell := Vector2i(sheet.get_width() / columns, sheet.get_height() / rows)
		var atlas := AtlasTexture.new()
		atlas.atlas = sheet
		atlas.region = Rect2i((index % columns) * cell.x, (index / columns) * cell.y, cell.x, cell.y)
		portrait.texture = atlas
	for button_index in choice_buttons.size():
		var button := choice_buttons[button_index]
		button.visible = button_index < data["choices"].size()
		if not button.visible:
			continue
		var choice: Dictionary = data["choices"][button_index]
		button.text = str(choice["label"])
		var need := int(choice.get("cost_qty", 1))
		button.disabled = (choice.has("cost_item") and bag.total(str(choice["cost_item"])) < need) or dna < int(choice.get("cost_dna", 0)) or (choice.has("recruit") and base.has_npc(str(choice["recruit"])))
		if button.disabled:
			button.text += "  ·  НЕДОСТУПНО"

func show_result(message: String) -> void:
	result_label.text = message
	for button in choice_buttons:
		button.visible = false
	leave_button = Button.new()
	leave_button.text = "ВЕРНУТЬСЯ"
	leave_button.position = Vector2(513, 444)
	leave_button.size = Vector2(563, 52)
	leave_button.pressed.connect(func() -> void: closed.emit())
	add_child(leave_button)
