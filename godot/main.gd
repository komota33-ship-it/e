extends Node2D

# Geometry is exported from the source layouts so each interaction remains
# aligned with its painted door, lift or searchable object.
const GROUND := 560.0
const WALKWAY_DEPTH := 40.0
const INFECTED_SPRITE_SCALE := 0.27
const PLAYER_SPEED := 220.0
const PLAYER_RUN_SPEED := 325.0
const HERO_STRIDE := 50.0
const HERO_MASTER_SCALE := 0.103
const HERO_ARM_SCALE := 0.095
const HERO_WALK_FRAMES := ["hero_walk_contact_a", "hero_walk_passing", "hero_walk_contact_b", "hero_walk_passing_b"]
const HERO_FOOT_BASELINES := {"hero_torso": 1380.0, "hero_walk_contact_a": 1365.0, "hero_walk_passing": 1378.0, "hero_walk_contact_b": 1378.0, "hero_walk_passing_b": 1377.0}
const MAGAZINE := 12
const PLAYER_DEATH_DURATION := 1.2
const SAVE_PATH := "user://lift_checkpoint.json"
const BOSS_FLOORS := {30: "elena", 25: "mama", 20: "chimera", 15: "carapace", 10: "alpha", 5: "matriarch", 0: "boss"}
const BOSS_HEALTH := {"elena": 800, "mama": 700, "chimera": 600, "carapace": 500, "alpha": 250, "matriarch": 300, "boss": 1500}

@onready var camera: Camera2D = $Camera
@onready var audio: LiftAudio = $Audio
@onready var hotbar: LiftHotbar = $HUD/Hotbar
@onready var status_card: LiftStatusCard = $HUD/StatusCard
@onready var settings_panel: Control = $HUD/Settings
@onready var sound_toggle: CheckButton = $HUD/Settings/SoundToggle
@onready var volume_slider: HSlider = $HUD/Settings/VolumeSlider
@onready var music_slider: HSlider = $HUD/Settings/MusicSlider
@onready var floor_label: Label = $HUD/Floor
@onready var status_label: Label = $HUD/Status
@onready var prompt_label: LiftKeyHints = $HUD/Prompt
@onready var search_label: Label = $HUD/SearchLabel
@onready var search_bar: ProgressBar = $HUD/SearchBar
@onready var inventory_view: LiftInventoryView = $HUD/Inventory
@onready var menu_backdrop: TextureRect = $HUD/MenuBackdrop
@onready var menu_overlay: Control = $HUD/MenuOverlay
@onready var menu_subtitle: Label = $HUD/MenuOverlay/MenuSubtitle
@onready var continue_button: Button = $HUD/MenuOverlay/MenuButtons/ContinueButton
@onready var save_button: Button = $HUD/MenuOverlay/MenuButtons/SaveButton
@onready var menu_button: Button = $HUD/MenuOverlay/MenuButtons/MenuButton
@onready var panel: PanelContainer = $HUD/Panel
@onready var panel_text: RichTextLabel = $HUD/Panel/Text
@onready var ending_backdrop: ColorRect = $HUD/EndingBackdrop
@onready var ending_title: Label = $HUD/EndingBackdrop/EndingTitle
@onready var ending_image: TextureRect = $HUD/EndingBackdrop/EndingImage
@onready var ending_story: RichTextLabel = $HUD/EndingBackdrop/EndingStory
@onready var journal_backdrop: ColorRect = $HUD/JournalBackdrop
@onready var journal_list: ItemList = $HUD/JournalBackdrop/JournalList
@onready var journal_title: Label = $HUD/JournalBackdrop/JournalTitle
@onready var journal_author: Label = $HUD/JournalBackdrop/JournalAuthor
@onready var journal_body: RichTextLabel = $HUD/JournalBackdrop/JournalBody
@onready var progress_backdrop: ColorRect = $HUD/ProgressBackdrop
@onready var perk_list: ItemList = $HUD/ProgressBackdrop/PerkList
@onready var perk_title: Label = $HUD/ProgressBackdrop/PerkTitle
@onready var perk_detail: RichTextLabel = $HUD/ProgressBackdrop/PerkDetail
@onready var progress_heading: Label = $HUD/ProgressBackdrop/ProgressHeading
@onready var radio_panel: ColorRect = $HUD/RadioPanel
@onready var radio_speaker: Label = $HUD/RadioPanel/Speaker
@onready var radio_message: Label = $HUD/RadioPanel/Message
@onready var base_view: LiftBaseView = $HUD/BaseView
@onready var encounter_view: LiftEncounterView = $HUD/EncounterView
@onready var death_overlay: Control = $HUD/DeathOverlay
@onready var death_detail: Label = $HUD/DeathOverlay/Detail
@onready var death_hint: LiftKeyHints = $HUD/DeathOverlay/Hint
@onready var death_checkpoint_button: Button = $HUD/DeathOverlay/CheckpointButton
@onready var death_base_button: Button = $HUD/DeathOverlay/BaseButton
@onready var checkpoint_banner: Control = $HUD/CheckpointBanner
@onready var checkpoint_detail: Label = $HUD/CheckpointBanner/Detail

var maps: Dictionary = {}
var catalog: Dictionary = {}
var bag: LiftInventory
var progression: LiftProgression
var base_store: LiftBase
var progress_open := false
var perk_ids: Array[String] = []
var active_weapon_uid := ""
var equipment := {"head": "", "torso": "", "hands": "", "feet": ""}
var dropped_items: Array[Dictionary] = []
var dna := 0
var journal_found: Array[String] = []
var journal_open := false
var played_story: Dictionary = {}
var radio_queue: Array = []
var radio_timer := 0.0
var ending_data: Dictionary = {}
var ending_ids := ["evacuation", "rescue", "truth"]
var selected_ending := 0
var ending_open := false
var run_finished := false
var completed_endings: Array[String] = []
var textures: Dictionary = {}
@onready var background_art: Node2D = $BackgroundArt
@onready var floor_art: Node2D = $FloorArt
var sprite_anchors: Dictionary = {}
var sprite_death_layouts: Dictionary = {}
var foreground_layouts: Dictionary = {}
var foreground_cells: Dictionary = {}
var apocalypse_layouts: Dictionary = {}
var apocalypse_cells: Dictionary = {}
var acid_cells: Array = []
var floor_number := 51
var room_id := ""
var layout: Dictionary = {}
var scale_factor := 1.0
var world_width := 1100.0
var player_x := 95.0
var return_x := 95.0
var facing := 1
var aim_angle := 0.0
var walk_distance := 0.0
var player_move_blend := 0.0
var scene_time := 0.0
var player_moving := false
var health := 100
var regen_remainder := 0.0
var infection := 0.0
var revives_used := 0
var stamina := 100.0
var dodge_time := 0.0
var dodge_cooldown := 0.0
var dodge_direction := 1
var flashlight_on := false
var battery := 100.0
var noise_events: Array[Dictionary] = []
var noise_clock := 0.0
var noise_cooldown := 0.0
var noise_warning := 0.0
var world_states: Dictionary = {}
var encounter_state: Dictionary = {}
var ammo := MAGAZINE
var reserve := 60
var fire_timer := 0.0
var reload_timer := 0.0
var reload_weapon_uid := ""
var hit_timer := 0.0
var muzzle_timer := 0.0
var enemies: Array[Dictionary] = []
var enemy_serial := 1
var projectiles: Array[Dictionary] = []
var grenades: Array[Dictionary] = []
var acid_pools: Array[Dictionary] = []
var hazard_clock := 0.0
var effects: Array[Dictionary] = []
var scene_enemies: Dictionary = {}
var scene_stains: Dictionary = {}
var stains: Array[Dictionary] = []
var spent_containers: Dictionary = {}
var container_remaining: Dictionary = {}
var trap_states: Dictionary = {}
var ambush_states: Dictionary = {}
var active_traps: Array[Dictionary] = []
var searching: Dictionary = {}
var crafting: Dictionary = {}
var current_action: Dictionary = {}
var paused := false
var menu_open := false
var death_open := false
var player_death_age := 0.0
var settings_open := false
var started := false
var info_timer := 0.0
var checkpoint_timer := 0.0
var test_mode := false

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var file := FileAccess.open("res://godot/layouts.json", FileAccess.READ)
	if file == null:
		push_error("Missing layout data; run node godot/export_layouts.mjs")
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		push_error("Invalid floor layout data")
		return
	maps = parsed
	var anchor_file := FileAccess.open("res://godot/sprite_anchors.json", FileAccess.READ)
	if anchor_file != null:
		var parsed_anchors: Variant = JSON.parse_string(anchor_file.get_as_text())
		if parsed_anchors is Dictionary:
			sprite_anchors = parsed_anchors
	var death_layout_file := FileAccess.open("res://godot/sprite_death_layouts.json", FileAccess.READ)
	if death_layout_file != null:
		var parsed_deaths: Variant = JSON.parse_string(death_layout_file.get_as_text())
		if parsed_deaths is Dictionary:
			sprite_death_layouts = parsed_deaths
	var catalog_file := FileAccess.open("res://godot/catalog.json", FileAccess.READ)
	if catalog_file == null:
		push_error("Missing Godot item catalog")
		return
	catalog = JSON.parse_string(catalog_file.get_as_text())
	var foreground_file := FileAccess.open("res://godot/foreground_layouts.json", FileAccess.READ)
	if foreground_file != null:
		var parsed_foreground: Variant = JSON.parse_string(foreground_file.get_as_text())
		if parsed_foreground is Dictionary:
			foreground_layouts = parsed_foreground
	var foreground_cells_file := FileAccess.open("res://godot/foreground_cells.json", FileAccess.READ)
	if foreground_cells_file != null:
		var parsed_cells: Variant = JSON.parse_string(foreground_cells_file.get_as_text())
		if parsed_cells is Dictionary:
			foreground_cells = parsed_cells
	var apocalypse_file := FileAccess.open("res://godot/apocalypse_layouts.json", FileAccess.READ)
	if apocalypse_file != null:
		var parsed_apocalypse: Variant = JSON.parse_string(apocalypse_file.get_as_text())
		if parsed_apocalypse is Dictionary:
			apocalypse_layouts = parsed_apocalypse
	var apocalypse_cells_file := FileAccess.open("res://godot/apocalypse_cells.json", FileAccess.READ)
	if apocalypse_cells_file != null:
		var parsed_apocalypse_cells: Variant = JSON.parse_string(apocalypse_cells_file.get_as_text())
		if parsed_apocalypse_cells is Dictionary:
			apocalypse_cells = parsed_apocalypse_cells
	var acid_cells_file := FileAccess.open("res://godot/acid_cells.json", FileAccess.READ)
	if acid_cells_file != null:
		var parsed_acid_cells: Variant = JSON.parse_string(acid_cells_file.get_as_text())
		if parsed_acid_cells is Array:
			acid_cells = parsed_acid_cells
	progression = LiftProgression.new(catalog)
	var has_profile := FileAccess.file_exists(LiftProgression.PATH)
	progression.load_profile()
	base_store = LiftBase.new(progression)
	dna = int(progression.profile["dna"])
	perk_ids.assign(catalog["perks"].keys())
	perk_list.item_selected.connect(select_perk)
	bag = LiftInventory.new(catalog)
	for initial in catalog["starterInventory"]:
		bag.add_item(initial["type"], int(initial["qty"]), initial)
	for item in bag.items:
		if item["type"] == "pistol":
			active_weapon_uid = item["uid"]
			break
	inventory_view.store = bag
	inventory_view.catalog = catalog
	hotbar.store = bag
	hotbar.view = inventory_view
	status_card.game = self
	inventory_view.quick_requested.connect(func(index: int, _type: String) -> void: hotbar.selected = index; hotbar.queue_redraw())
	sound_toggle.button_pressed = audio.enabled
	volume_slider.value = audio.master_volume
	music_slider.value = audio.music_volume
	sound_toggle.toggled.connect(func(value: bool) -> void: audio.enabled = value; audio.save_settings())
	volume_slider.value_changed.connect(func(value: float) -> void: audio.master_volume = value; audio.save_settings())
	music_slider.value_changed.connect(func(value: float) -> void: audio.music_volume = value; audio.save_settings())
	continue_button.pressed.connect(continue_game)
	$HUD/MenuOverlay/MenuButtons/NewButton.pressed.connect(start_new_game)
	$HUD/MenuOverlay/MenuButtons/BaseButton.pressed.connect(open_base)
	save_button.pressed.connect(func() -> void: menu_subtitle.text = ("ПРОГРЕСС СОХРАНЁН · %s" % layout.get("title", "")) if save_game() else "НЕ УДАЛОСЬ СОХРАНИТЬ ПРОГРЕСС")
	$HUD/MenuOverlay/MenuButtons/SettingsButton.pressed.connect(open_settings)
	menu_button.pressed.connect(show_main_menu)
	$HUD/MenuOverlay/MenuButtons/QuitButton.pressed.connect(func() -> void: get_tree().quit())
	for control in $HUD/MenuOverlay/MenuButtons.get_children():
		style_menu_button(control)
	base_view.setup(base_store, catalog)
	base_view.exit_requested.connect(show_main_menu)
	base_view.new_run_requested.connect(start_new_game)
	encounter_view.choice_selected.connect(resolve_encounter)
	encounter_view.closed.connect(close_encounter)
	death_checkpoint_button.pressed.connect(retry_checkpoint)
	death_base_button.pressed.connect(return_to_base)
	style_menu_button(death_checkpoint_button)
	style_menu_button(death_base_button)
	inventory_view.use_requested.connect(use_inventory_item)
	inventory_view.drop_requested.connect(drop_inventory_item)
	inventory_view.equip_requested.connect(equip_inventory_item)
	inventory_view.craft_requested.connect(craft_inventory_item)
	inventory_view.attachment_requested.connect(change_attachment)
	journal_list.item_selected.connect(select_journal_entry)
	if FileAccess.file_exists("user://lift_journal.json"):
		var journal_file := FileAccess.open("user://lift_journal.json", FileAccess.READ)
		var ids: Variant = JSON.parse_string(journal_file.get_as_text())
		if ids is Array:
			for id in ids:
				if id is String:
					journal_found.append(id)
	var endings_file := FileAccess.open("res://godot/endings.json", FileAccess.READ)
	if endings_file != null:
		ending_data = JSON.parse_string(endings_file.get_as_text())
	if FileAccess.file_exists("user://lift_endings.json"):
		var ending_history_file := FileAccess.open("user://lift_endings.json", FileAccess.READ)
		var ending_history: Variant = JSON.parse_string(ending_history_file.get_as_text())
		if ending_history is Array:
			for id in ending_history:
				if id is String and ending_data.has(id) and not completed_endings.has(id):
					completed_endings.append(id)
		elif ending_history is Dictionary and ending_data.has(ending_history.get("ending", "")):
			completed_endings.append(ending_history["ending"])
	for name in ["roof", "floorsA", "floorsB", "rooms", "sector_office", "sector_laboratory", "sector_apartment", "sector_mall", "sector_parking", "city_panorama", "floor_surfaces", "doors", "lift_door", "foreground_office", "foreground_laboratory", "foreground_apartment", "foreground_mall", "foreground_parking", "foreground_roof", "foreground_bunker", "hero_torso", "hero_walk_contact_a", "hero_walk_passing", "hero_walk_contact_b", "hero_walk_passing_b", "hero_support_arm", "survivor_idle", "survivor_dog", "motion_player", "walk_player", "walk_walker", "walk_runner", "walk_spitter", "walk_screamer", "walk_brute", "walk_armored", "walk_boss", "walk_chimera", "motion_matriarch", "motion_alpha", "motion_carapace", "motion_chimera", "motion_mama", "motion_elena", "surrender_mama", "death_player", "death_walker", "death_runner", "death_spitter", "death_chimera", "death_mama", "death_elena", "melee_walker", "melee_runner", "melee_brute", "melee_armored", "melee_boss", "scream_screamer", "spit_spitter", "spit_chimera", "volley_boss", "weapon_arms", "weapon_arsenal", "acid", "brute_burst"]:
		var asset_name: String = {"hero_torso": "hero_master", "weapon_arsenal": "weapon_arsenal_single"}.get(name, name)
		if ResourceLoader.exists("res://assets/%s.png" % asset_name):
			textures[name] = load("res://assets/%s.png" % asset_name)
	for zone in ["office", "laboratory", "apartment", "mall", "parking", "roof", "bunker"]:
		for sheet in ["a", "b"]:
			var name := "apocalypse_%s_%s" % [zone, sheet]
			textures[name] = load("res://assets/%s.png" % name)
	for floor_key in maps:
		var unique_image: String = maps[floor_key].get("uniqueImage", "")
		if unique_image != "":
			textures["floor_unique_%s" % floor_key] = load("res://assets/%s" % unique_image)
	if FileAccess.file_exists(SAVE_PATH):
		var saved_file := FileAccess.open(SAVE_PATH, FileAccess.READ)
		var saved: Variant = JSON.parse_string(saved_file.get_as_text())
		if saved is Dictionary:
			floor_number = int(saved.get("floor", 51))
			health = int(saved.get("health", 100))
			run_finished = bool(saved.get("finished", false))
			infection = float(saved.get("infection", 0))
			revives_used = int(saved.get("revivesUsed", 0))
			stamina = float(saved.get("stamina", 100))
			battery = float(saved.get("battery", 100))
			world_states = saved.get("world", {})
			enemy_serial = int(saved.get("enemySerial", 1))
			ammo = int(saved.get("ammo", MAGAZINE))
			reserve = int(saved.get("reserve", 60))
			if not has_profile:
				dna = int(saved.get("dna", 0))
				progression.profile["dna"] = dna
			if saved.has("inventory"):
				bag.restore(saved["inventory"])
				active_weapon_uid = saved.get("activeWeapon", "")
				if bag.find_item(active_weapon_uid).is_empty():
					for item in bag.items:
						if bag.definition(item["type"]).get("group") == "weapon":
							active_weapon_uid = item["uid"]
							break
				equipment = saved.get("equipment", equipment)
				dropped_items.assign(saved.get("drops", []))
				inventory_view.quick_slots.assign(saved.get("quickSlots", inventory_view.quick_slots))
			else:
				var gun := bag.find_item(active_weapon_uid)
				if not gun.is_empty():
					gun["loaded"] = ammo
				bag.consume("ammo", bag.total("ammo"))
				bag.add_item("ammo", reserve)
	sync_ammo()
	load_floor(floor_number)
	if FileAccess.file_exists(SAVE_PATH):
		var position_file := FileAccess.open(SAVE_PATH, FileAccess.READ)
		var position_save: Variant = JSON.parse_string(position_file.get_as_text())
		if position_save is Dictionary:
			var saved_room: String = position_save.get("room", "")
			if saved_room != "" and maps[str(floor_number)]["rooms"].has(saved_room):
				room_id = saved_room
				layout = maps[str(floor_number)]["rooms"][room_id]
				update_dimensions()
				spawn_enemies()
			return_x = float(position_save.get("returnX", return_x))
			player_x = clampf(float(position_save.get("x", player_x)), 35.0, world_width - 35.0)
	started = true
	background_art.queue_redraw()
	floor_art.queue_redraw()
	menu_backdrop.texture = load("res://assets/menu_backdrop.png")
	var frame_style := StyleBoxFlat.new()
	frame_style.bg_color = Color("#132022")
	frame_style.border_color = Color("#ae8e5b")
	frame_style.set_border_width_all(2)
	frame_style.set_corner_radius_all(18)
	frame_style.set_content_margin_all(28)
	panel.add_theme_stylebox_override("panel", frame_style)
	var checkpoint_style := StyleBoxFlat.new()
	checkpoint_style.bg_color = Color("#101e21ee")
	checkpoint_style.border_color = Color("#b89a63")
	checkpoint_style.set_border_width_all(1)
	checkpoint_style.set_corner_radius_all(10)
	$HUD/CheckpointBanner/Frame.add_theme_stylebox_override("panel", checkpoint_style)
	var search_bg := StyleBoxFlat.new()
	search_bg.bg_color = Color("#142222")
	search_bg.border_color = Color("#b69a67")
	search_bg.set_border_width_all(1)
	search_bg.set_corner_radius_all(9)
	search_bar.add_theme_stylebox_override("background", search_bg)
	var search_fill := StyleBoxFlat.new()
	search_fill.bg_color = Color("#b49b5f")
	search_fill.set_corner_radius_all(8)
	search_bar.add_theme_stylebox_override("fill", search_fill)
	panel_text.add_theme_color_override("default_color", Color("#e1e4d9"))
	floor_label.add_theme_color_override("font_color", Color("#e0d7bd"))
	status_label.add_theme_color_override("font_color", Color("#d6b77e"))
	show_main_menu()

func style_menu_button(button: Button) -> void:
	var regular := StyleBoxFlat.new()
	regular.bg_color = Color("#19282adb")
	regular.border_color = Color("#776f55")
	regular.set_border_width_all(1)
	regular.set_corner_radius_all(10)
	regular.set_content_margin_all(8)
	var highlighted := regular.duplicate()
	highlighted.bg_color = Color("#394338")
	highlighted.border_color = Color("#d3ac68")
	var pressed_style := highlighted.duplicate()
	pressed_style.bg_color = Color("#58432d")
	button.add_theme_stylebox_override("normal", regular)
	button.add_theme_stylebox_override("hover", highlighted)
	button.add_theme_stylebox_override("focus", highlighted)
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_color_override("font_color", Color("#e4dac1"))
	button.add_theme_color_override("font_hover_color", Color("#fff0cb"))
	button.add_theme_font_size_override("font_size", 18)
	button.mouse_entered.connect(func() -> void: audio.play_sfx("ui"); button.create_tween().tween_property(button, "scale", Vector2(1.02, 1.02), 0.1))
	button.mouse_exited.connect(func() -> void: button.create_tween().tween_property(button, "scale", Vector2.ONE, 0.1))

func show_main_menu() -> void:
	dna = int(progression.profile["dna"])
	checkpoint_banner.visible = false
	checkpoint_timer = 0.0
	menu_open = true
	paused = true
	base_view.visible = false
	encounter_view.visible = false
	death_overlay.visible = false
	death_open = false
	player_death_age = 0.0
	radio_panel.visible = false
	menu_backdrop.visible = true
	menu_overlay.visible = true
	panel.visible = false
	continue_button.text = "НОВЫЙ СПУСК" if run_finished else ("ПРОДОЛЖИТЬ" if FileAccess.file_exists(SAVE_PATH) else "НАЧАТЬ СПУСК")
	menu_subtitle.text = "Эвакуация сорвалась. Путь вниз открыт."
	save_button.visible = false
	menu_button.visible = false
	$HUD/MenuOverlay/MenuButtons/BaseButton.visible = true

func open_base() -> void:
	paused = true
	menu_open = false
	menu_overlay.visible = false
	menu_backdrop.visible = false
	base_view.show_base()

func continue_game() -> void:
	if run_finished:
		start_new_game()
		return
	menu_open = false
	close_panel()

func start_new_game() -> void:
	DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))
	health = 100
	reset_run_state()
	reset_inventory()
	var prepared := base_store.take_prepared()
	for id in prepared:
		var quantity := int(prepared[id])
		var leftover := bag.add_item(id, quantity)
		if leftover > 0:
			base_store.store_supply(id, leftover, catalog)
	var armory_ammo := base_store.room_level("armory") * 4
	if armory_ammo > 0:
		bag.add_item("ammo", armory_ammo)
	if base_store.room_level("laboratory") > 0:
		bag.add_item("antidote", 1)
	dna = int(progression.profile["dna"])
	sync_ammo()
	load_floor(51)
	menu_open = false
	base_view.visible = false
	encounter_view.visible = false
	death_overlay.visible = false
	death_open = false
	player_death_age = 0.0
	close_panel()

func load_floor(number: int) -> void:
	checkpoint_banner.visible = false
	checkpoint_timer = 0.0
	if not layout.is_empty():
		remember_scene()
		world_states[str(floor_number)] = snapshot_floor()
	floor_number = number
	room_id = ""
	layout = maps.get(str(number), maps["51"])
	update_dimensions()
	player_x = minf(95.0, world_width * 0.2)
	update_camera()
	var floor_state: Dictionary = world_states.get(str(number), {})
	spent_containers = floor_state.get("spent", {}).duplicate(true)
	container_remaining = floor_state.get("remaining", {}).duplicate(true)
	scene_stains = floor_state.get("stains", {}).duplicate(true)
	trap_states = floor_state.get("trapStates", {}).duplicate(true)
	ambush_states = floor_state.get("ambushStates", {}).duplicate(true)
	encounter_state = floor_state.get("encounter", {}).duplicate(true)
	active_traps.assign(floor_state.get("activeTraps", []).duplicate(true))
	cancel_search()
	projectiles.clear()
	grenades.clear()
	acid_pools.clear()
	effects.clear()
	noise_events.clear()
	noise_warning = 0.0
	noise_cooldown = 0.0
	scene_enemies = floor_state.get("scenes", {}).duplicate(true)
	spawn_enemies()
	if encounter_state.is_empty():
		encounter_state = LiftEncounters.for_floor(floor_number)
	if not encounter_state.is_empty() and not encounter_state.has("room"):
		assign_encounter_room()
		encounter_state["resolved"] = bool(encounter_state.get("resolved", false))
	progression.record_depth(floor_number)
	radio_queue.clear()
	radio_panel.visible = false
	play_floor_story()
	if not encounter_state.is_empty() and not bool(encounter_state.get("resolved", false)) and base_store.room_level("radio") > 0:
		var radio_rank := base_store.room_level("radio")
		var call_text := "Есть сигнал выжившего на этом этаже."
		var room_name := "помещения"
		for door in layout.get("doors", []):
			if str(door["id"]) == str(encounter_state["room"]):
				room_name = str(door["name"])
				break
		if radio_rank >= 2:
			var section: String = str(encounter_state["room"]).split("-")[0]
			call_text = "Сигнал идёт из %s." % {"medical": "медпункта", "technical": "мастерской", "residential": "жилой комнаты"}.get(section, "соседней комнаты")
		if radio_rank >= 3:
			call_text = "Выживший на этаже: %s." % encounter_state["name"]
		if radio_rank >= 4:
			call_text = "%s ждёт в %s." % [encounter_state["name"], room_name]
		if radio_rank >= 5 and not encounter_state["choices"].is_empty():
			var first_choice: Dictionary = encounter_state["choices"][0]
			if first_choice.has("cost_item"):
				call_text += " Нужны: %s." % catalog["items"].get(first_choice["cost_item"], {}).get("name", first_choice["cost_item"])
			elif first_choice.has("cost_dna"):
				call_text += " Запасите %d ДНК." % int(first_choice["cost_dna"])
		radio_queue.append({"speaker": "РАДИО УБЕЖИЩА", "text": call_text})
		if not radio_panel.visible:
			show_next_radio()
	refresh_hud()
	queue_redraw()

func remember_scene() -> void:
	if not layout.is_empty() and layout.has("id"):
		scene_enemies[layout["id"]] = enemies.duplicate(true)
		scene_stains[layout["id"]] = stains.duplicate(true)

func snapshot_floor() -> Dictionary:
	return {"scenes": scene_enemies.duplicate(true), "stains": scene_stains.duplicate(true), "spent": spent_containers.duplicate(true), "remaining": container_remaining.duplicate(true), "trapStates": trap_states.duplicate(true), "ambushStates": ambush_states.duplicate(true), "activeTraps": active_traps.duplicate(true), "encounter": encounter_state.duplicate(true)}

func assign_encounter_room() -> void:
	var preferred: String = {"wounded": "medical", "trader": "residential", "group": "residential", "child": "residential", "soldier": "technical", "cultist": "medical", "thief": "technical", "madman": "residential", "dog": "technical"}.get(encounter_state.get("id", ""), "residential")
	var doors: Array = layout.get("doors", [])
	if doors.is_empty():
		encounter_state.clear()
		return
	var chosen: Dictionary = doors[0]
	for door in doors:
		if str(door["id"]).begins_with(preferred):
			chosen = door
			break
	var id: String = chosen["id"]
	var room: Dictionary = layout["rooms"][id]
	encounter_state["room"] = id
	encounter_state["x"] = clampf(float(room.get("width", 440.0)) * 0.57, 140.0, float(room.get("width", 440.0)) - 95.0)

func update_dimensions() -> void:
	var crop: Array = layout["crop"]
	var openings: Array = layout.get("doors", [])
	var door_height := 176.0
	if room_id != "":
		door_height = float(layout["exit"]["rect"][3])
	elif floor_number == 51:
		door_height = 204.0
	elif not openings.is_empty():
		door_height = float(openings[0]["rect"][3])
	scale_factor = 148.0 / door_height
	world_width = float(layout.get("width", crop[2] * scale_factor))
	if not layout.has("parts"):
		world_width = float(crop[2]) * scale_factor
	else:
		var rightmost := 0.0
		for part in layout["parts"]:
			rightmost = maxf(rightmost, (float(part["x"]) + float(part["width"])) * scale_factor)
		world_width = rightmost
	background_art.queue_redraw()
	floor_art.queue_redraw()
	update_camera()

func update_camera() -> void:
	if layout.is_empty():
		return
	var art_height := float(layout["crop"][3]) * scale_factor
	var zoom_level := 1280.0 / world_width if floor_number == 51 and room_id == "" else maxf(560.0 / art_height, 1020.0 / world_width if room_id != "" else 1.0)
	var panorama_top := 0.0
	var panorama_height := art_height
	if room_id == "" and layout.get("uniqueBackground", false):
		for part in layout["parts"]:
			if part.has("uniqueGround"):
				panorama_top = GROUND - float(part["uniqueGround"])
				panorama_height = float(part["height"]) * scale_factor
				break
		zoom_level = clampf(980.0 / panorama_height, 1.52, 1.56)
	zoom_level = clampf(zoom_level, 1.0, 2.25)
	camera.zoom = Vector2.ONE * zoom_level
	var visible_half_width := 640.0 / zoom_level
	camera.position.x = world_width * 0.5 if world_width <= visible_half_width * 2.0 else clampf(player_x, visible_half_width, world_width - visible_half_width)
	camera.position.y = panorama_top + panorama_height * 0.5 + 34.0 if room_id == "" and layout.get("uniqueBackground", false) else (GROUND - 200.0 / zoom_level if floor_number == 51 and room_id == "" else GROUND - float(layout["ground"]) * scale_factor + art_height * 0.5 + (actor_ground() - GROUND) * (0.4 if room_id != "" else 0.68))

func actor_ground() -> float:
	return GROUND if layout.get("zone", "roof") == "roof" else GROUND + (WALKWAY_DEPTH * 0.5 if room_id != "" else WALKWAY_DEPTH)

func spawn_enemies() -> void:
	enemies.clear()
	stains.assign(scene_stains.get(layout["id"], []).duplicate(true))
	if room_id != "" and not encounter_state.is_empty() and room_id == str(encounter_state.get("room", "")):
		return
	if scene_enemies.has(layout["id"]):
		for enemy in scene_enemies[layout["id"]]:
			enemies.append(enemy.duplicate(true))
		return
	var zone: String = layout.get("zone", "office")
	var types: Array[String] = ["walker"]
	if floor_number == 0 and room_id == "":
		enemies.append(make_enemy("boss", world_width * 0.59, true))
		return
	match zone:
		"office": types = ["walker", "runner"]
		"laboratory": types = ["walker", "spitter"]
		"apartment": types = ["walker", "runner"]
		"mall": types = ["runner", "brute", "screamer"]
		"parking", "bunker": types = ["armored", "walker"]
	var count := 1 if room_id != "" else (2 if floor_number == 51 else clampi(4 + int((world_width - 1800.0) / 550.0) + (2 if zone == "mall" else 0), 4, 10))
	for index in count:
		var x := world_width * float(index + 2) / float(count + 2)
		if x < player_x + 180.0:
			x = player_x + 210.0 + 140.0 * index
		var kind: String = types[index % types.size()]
		enemies.append(make_enemy(kind, minf(x, world_width - 65.0)))
	if room_id == "" and BOSS_FLOORS.has(floor_number):
		enemies.append(make_enemy(BOSS_FLOORS[floor_number], world_width * 0.77, true))

func make_enemy(kind: String, x: float, boss := false) -> Dictionary:
	var health_by_type := {"walker": 20, "runner": 10, "brute": 80, "screamer": 15, "spitter": 25, "armored": 60}
	var hp := int(BOSS_HEALTH.get(kind, health_by_type.get(kind, 20)))
	if not boss and kind != "elena_echo":
		var multiplier: float = {"roof": 1.0, "office": 1.0, "laboratory": 1.3, "apartment": 1.6, "mall": 1.9, "parking": 2.2, "bunker": 2.5}.get(layout.get("zone", "office"), 1.0)
		hp = roundi(hp * multiplier)
	var enemy := {"id": enemy_serial, "x": x, "type": kind, "hp": hp, "maxHp": hp, "boss": boss, "dead": false, "searched": false, "death_time": 0.0, "walk": randf() * 8.0, "cooldown": randf() * 1.5, "attack_time": 0.0, "attack_duration": 0.0, "attack_kind": "", "attack_fired": false, "face": -1, "surrendered": false, "surrendered_once": false, "phase": 0, "mutations": [], "burst": false, "brain": "chase" if boss else "sleep", "home_x": x, "target_x": x, "memory": 0.0, "patrol_dir": -1, "sleep_left": randf_range(1.0, 4.0), "slow_timer": 0.0, "regen_delay": 0.0, "hit_time": 0.0, "hit_fx_cooldown": 0.0, "hit_dir": 0.0}
	enemy_serial += 1
	if kind == "chimera":
		var pool := ["fast", "armored", "acidic", "regenerative"]
		pool.shuffle()
		enemy["mutations"] = pool.slice(0, 2)
	return enemy

func update_enemy(enemy: Dictionary, delta: float, modifiers: Dictionary) -> void:
	if enemy["dead"]:
		enemy["death_time"] += delta
		if enemy["type"] == "brute" and not enemy["burst"] and enemy["death_time"] >= 0.65:
			enemy["burst"] = true
			explode_at(enemy["x"], actor_ground() - 12.0, 145.0, 24, Color("#d5b045"))
		return
	enemy["hit_time"] = maxf(0.0, float(enemy.get("hit_time", 0.0)) - delta)
	enemy["hit_fx_cooldown"] = maxf(0.0, float(enemy.get("hit_fx_cooldown", 0.0)) - delta)
	if enemy.get("surrendered", false):
		return
	if enemy["type"] == "elena_echo":
		enemy["ttl"] -= delta
		if enemy["ttl"] <= 0.0:
			enemy["dead"] = true
			return
	enemy["regen_delay"] = maxf(0.0, float(enemy.get("regen_delay", 0.0)) - delta)
	if enemy["type"] == "chimera" and enemy["mutations"].has("regenerative") and enemy["regen_delay"] <= 0.0:
		enemy["hp"] = minf(float(enemy["maxHp"]), float(enemy["hp"]) + 4.0 * delta)
	enemy["slow_timer"] = maxf(0.0, float(enemy.get("slow_timer", 0.0)) - delta)
	var distance: float = player_x - float(enemy["x"])
	var dark := ["parking", "bunker", "technical"].has(layout.get("zone", ""))
	var sight_range := (330.0 if flashlight_on else 130.0) if dark else 390.0
	var sees_player := bool(enemy["boss"]) or absf(distance) < 75.0 or (absf(distance) < sight_range and distance * int(enemy["face"]) >= 0.0)
	if sees_player:
		enemy["brain"] = "chase"
		enemy["target_x"] = player_x
		enemy["memory"] = 5.0
	elif float(enemy["memory"]) > 0.0:
		enemy["memory"] = maxf(0.0, float(enemy["memory"]) - delta)
		enemy["brain"] = "investigate"
	else:
		if enemy["brain"] == "sleep":
			enemy["sleep_left"] -= delta
			if enemy["sleep_left"] <= 0.0:
				enemy["brain"] = "patrol"
		if enemy["brain"] == "patrol":
			enemy["target_x"] = clampf(float(enemy["home_x"]) + int(enemy["patrol_dir"]) * 65.0, 35.0, world_width - 35.0)
			if absf(float(enemy["target_x"]) - float(enemy["x"])) < 5.0:
				enemy["patrol_dir"] = -int(enemy["patrol_dir"])
	if enemy["brain"] == "chase" or enemy["brain"] == "investigate":
		enemy["face"] = 1 if float(enemy["target_x"]) > float(enemy["x"]) else -1
	if enemy["attack_time"] > 0.0:
		enemy["attack_time"] -= delta
		if not enemy["attack_fired"] and enemy["attack_time"] <= enemy["impact_at"]:
			enemy["attack_fired"] = true
			resolve_enemy_attack(enemy)
		return
	enemy["cooldown"] = maxf(0.0, float(enemy["cooldown"]) - delta)
	if enemy["cooldown"] <= 0.0 and (sees_player or absf(distance) < 80.0):
		var kind := choose_enemy_attack(enemy, absf(distance))
		if kind != "":
			begin_enemy_attack(enemy, kind)
			return
	var target_distance: float = float(enemy["target_x"]) - float(enemy["x"])
	if enemy["brain"] != "sleep" and absf(target_distance) > 20.0:
		var speed_by_type := {"walker": 52.0, "runner": 135.0, "brute": 35.0, "screamer": 68.0, "spitter": 45.0, "armored": 42.0, "matriarch": 43.0, "alpha": 80.0, "carapace": 38.0, "chimera": 70.0, "mama": 50.0, "elena": 72.0, "elena_echo": 90.0, "boss": 60.0}
		var speed: float = speed_by_type.get(enemy["type"], 55.0)
		if enemy["mutations"].has("fast"):
			speed *= 1.5
		if enemy["slow_timer"] > 0.0:
			speed *= 0.7
		speed *= float(modifiers["enemySpeed"])
		enemy["x"] = clampf(float(enemy["x"]) + signf(target_distance) * minf(absf(target_distance), speed * delta), 35.0, world_width - 35.0)
		enemy["face"] = 1 if target_distance > 0.0 else -1
		enemy["walk"] += delta * speed / 12.0

func choose_enemy_attack(enemy: Dictionary, distance: float) -> String:
	var kind: String = enemy["type"]
	if kind == "screamer" or kind == "alpha":
		return "scream" if distance < 560.0 else ""
	if kind == "spitter" or kind == "chimera":
		if distance < 560.0 and distance > 80.0:
			return "spit"
	if kind == "elena" or kind == "boss":
		if distance < 640.0 and distance > 90.0:
			return "volley"
	if kind == "mama" or kind == "matriarch":
		if distance < 460.0 and enemy["hp"] < enemy["maxHp"] * 0.7:
			return "summon"
	if kind == "runner" and distance < 220.0 and distance > 55.0:
		return "dash"
	return "heavy" if distance < 55.0 and ["brute", "armored", "carapace", "mama", "matriarch", "boss"].has(kind) else ("melee" if distance < 50.0 else "")

func begin_enemy_attack(enemy: Dictionary, kind: String) -> void:
	var windup: float = {"melee": 0.30, "heavy": 0.52, "spit": 0.48, "scream": 0.64, "dash": 0.24, "volley": 0.68, "summon": 0.80}.get(kind, 0.3)
	var recovery := 0.5 if kind != "scream" and kind != "summon" else 0.75
	enemy["attack_kind"] = kind
	enemy["attack_fired"] = false
	enemy["impact_at"] = recovery
	enemy["attack_time"] = windup + recovery
	enemy["attack_duration"] = windup + recovery
	enemy["cooldown"] = {"melee": 1.0, "heavy": 1.7, "spit": 2.8, "scream": 8.0, "dash": 3.0, "volley": 3.0, "summon": 7.0}.get(kind, 1.0)

func resolve_enemy_attack(enemy: Dictionary) -> void:
	var kind: String = enemy["attack_kind"]
	match kind:
		"scream":
			spawn_minions(enemy["x"], 5)
			effect_burst(enemy["x"], actor_ground() - 115.0, Color("#c46f6b"), 12)
		"summon":
			spawn_minions(enemy["x"], 2 if enemy["type"] == "mama" else 3)
		"spit":
			spawn_acid(enemy["x"], actor_ground() - 100.0, 16 if enemy["type"] == "chimera" else 12)
		"volley":
			for offset in [-0.16, 0.0, 0.16]:
				spawn_acid(enemy["x"], actor_ground() - 112.0, 16 if enemy["type"] == "boss" else 12, offset)
		"dash":
			enemy["x"] = clampf(float(enemy["x"]) + int(enemy["face"]) * 88.0, 35.0, world_width - 35.0)
			if absf(player_x - enemy["x"]) < 72.0:
				player_hit(8)
		_:
			if absf(player_x - enemy["x"]) < 66.0:
				var damage: int = {"walker": 5, "runner": 8, "brute": 20, "armored": 15, "carapace": 22, "mama": 18, "matriarch": 20, "boss": 26}.get(enemy["type"], 9)
				player_hit(damage)

func player_hit(amount: int, infect := true) -> void:
	if hit_timer > 0.0 or health <= 0 or dodge_time > 0.0:
		return
	cancel_search()
	apply_hit(amount)
	if infect:
		infection = minf(100.0, infection + 10.0 * (1.0 - float(progression.effects()["infectionResistance"])))
	audio.play_sfx("hit")
	hit_timer = 0.65
	effect_burst(player_x, actor_ground() - 75.0, Color("#a4493e"), 7)
	add_stain("blood", player_x, 14.0)
	if health <= 0:
		die()

func die() -> void:
	if health > 0 or death_open:
		return
	var run_effects := progression.effects()
	if revives_used < int(run_effects["revivals"]):
		revives_used += 1
		health = maxi(1, roundi(float(run_effects["maxHp"]) * float(run_effects["revivalHealth"])))
		infection = minf(infection, 50.0)
		hit_timer = 2.0
		return
	progression.profile["deaths"] = int(progression.profile["deaths"]) + 1
	progression.save_profile()
	cancel_search()
	crafting.clear()
	prompt_label.visible = false
	checkpoint_banner.visible = false
	checkpoint_timer = 0.0
	death_open = true
	player_death_age = 0.0
	paused = true
	radio_panel.visible = false
	menu_overlay.visible = false
	menu_backdrop.visible = false
	panel.visible = false
	death_overlay.visible = false
	death_overlay.modulate.a = 0.0
	refresh_hud()
	status_card.queue_redraw()
	queue_redraw()
	var floor_title := "КРЫША" if floor_number == 51 else ("БУНКЕР B1" if floor_number == 0 else "%d ЭТАЖ" % floor_number)
	death_detail.text = "%s · СОБРАНО ДНК %d" % [floor_title, int(progression.profile["dna"])]
	var has_checkpoint := FileAccess.file_exists(SAVE_PATH)
	death_checkpoint_button.text = "К ПОСЛЕДНЕМУ ЧЕКПОИНТУ" if has_checkpoint else "НОВЫЙ СПУСК С КРЫШИ"
	death_hint.set_hints("ENTER|ЧЕКПОИНТ;B|УБЕЖИЩЕ" if has_checkpoint else "ENTER|НОВЫЙ СПУСК;B|УБЕЖИЩЕ")

func update_player_death(delta: float) -> void:
	if not death_open or player_death_age >= PLAYER_DEATH_DURATION:
		return
	player_death_age = minf(PLAYER_DEATH_DURATION, player_death_age + delta)
	if player_death_age >= 0.82:
		death_overlay.visible = true
		death_overlay.modulate.a = clampf((player_death_age - 0.82) / (PLAYER_DEATH_DURATION - 0.82), 0.0, 1.0)
	queue_redraw()

func retry_checkpoint() -> void:
	if not death_open or player_death_age < PLAYER_DEATH_DURATION:
		return
	death_open = false
	death_overlay.visible = false
	player_death_age = 0.0
	if FileAccess.file_exists(SAVE_PATH):
		restore_checkpoint()
		close_panel()
	else:
		start_new_game()

func return_to_base() -> void:
	if not death_open or player_death_age < PLAYER_DEATH_DURATION:
		return
	death_open = false
	death_overlay.visible = false
	player_death_age = 0.0
	DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))
	reset_run_state()
	reset_inventory()
	health = 100
	load_floor(51)
	open_base()

func add_noise(amount: float) -> void:
	if amount <= 0.0:
		return
	noise_events.append({"time": noise_clock, "amount": amount * float(progression.effects()["noiseFactor"])})
	for enemy in enemies:
		if enemy["dead"] or enemy.get("surrendered", false):
			continue
		if absf(float(enemy["x"]) - player_x) < minf(1200.0, 30.0 + amount * 20.0):
			enemy["target_x"] = player_x
			enemy["memory"] = 5.0
			enemy["brain"] = "investigate"

func update_noise(delta: float) -> void:
	noise_clock += delta
	noise_cooldown = maxf(0.0, noise_cooldown - delta)
	for index in range(noise_events.size() - 1, -1, -1):
		if noise_clock - float(noise_events[index]["time"]) > 5.0:
			noise_events.remove_at(index)
	if noise_warning > 0.0:
		noise_warning = maxf(0.0, noise_warning - delta)
		if noise_warning == 0.0:
			spawn_minions(player_x + 280.0, 4)
			play_radio_beat("noiseWave", true)
	var level := noise_level()
	var threshold: float = {"roof": 100.0, "office": 90.0, "laboratory": 80.0, "apartment": 70.0, "mall": 100.0, "parking": 65.0, "bunker": 90.0}.get(layout.get("zone", "office"), 90.0)
	if noise_cooldown <= 0.0 and noise_warning <= 0.0 and level > threshold:
		noise_events.clear()
		noise_warning = 3.0
		noise_cooldown = 25.0
		inventory_view.notice = "ШУМ ПРИВЛЁК ЗАРАЖЁННЫХ · ОРДА ЧЕРЕЗ 3 С"

func noise_level() -> float:
	var value := 0.0
	for event in noise_events:
		value += float(event["amount"])
	return value

func start_dodge() -> void:
	var cost := 25.0 * float(gear_stats()["staminaCost"])
	if dodge_time > 0.0 or dodge_cooldown > 0.0 or stamina < cost or paused:
		return
	stamina -= cost
	dodge_time = 0.3
	dodge_cooldown = 1.5
	dodge_direction = facing
	cancel_search()

func spawn_minions(source_x: float, count: int) -> void:
	var active := 0
	for enemy in enemies:
		if not enemy["dead"]:
			active += 1
	for index in mini(count, maxi(0, 15 - active)):
		var direction := -1 if index % 2 == 0 else 1
		enemies.append(make_enemy("runner" if index % 3 == 0 else "walker", clampf(source_x + direction * (85.0 + index * 36.0), 35.0, world_width - 35.0)))

func spawn_acid(source_x: float, source_y: float, damage: int, angle_offset := 0.0) -> void:
	audio.play_sfx("acid")
	var toward := (Vector2(player_x, actor_ground() - 60.0) - Vector2(source_x, source_y)).normalized().rotated(angle_offset)
	projectiles.append({"x": source_x, "y": source_y, "vx": toward.x * 330.0, "vy": toward.y * 330.0, "damage": damage, "ttl": 2.0, "age": 0.0, "kind": "acid"})

func update_projectiles(delta: float) -> void:
	for index in range(projectiles.size() - 1, -1, -1):
		var projectile := projectiles[index]
		projectile["ttl"] -= delta
		projectile["age"] = float(projectile.get("age", 0.0)) + delta
		projectile["x"] += projectile["vx"] * delta
		projectile["y"] += projectile["vy"] * delta
		if absf(projectile["x"] - player_x) < 27.0 and projectile["y"] > actor_ground() - 125.0 and projectile["y"] < actor_ground() - 15.0:
			player_hit(int(projectile["damage"]), false)
			effects.append({"kind": "acid_splash", "x": projectile["x"], "y": projectile["y"], "age": 0.0, "life": 0.42})
			effect_burst(projectile["x"], projectile["y"], Color("#84b343"), 9)
			projectiles.remove_at(index)
		elif projectile["ttl"] <= 0.0 or projectile["y"] >= actor_ground() - 10.0:
			var splash_y := minf(float(projectile["y"]), actor_ground() - 10.0)
			effects.append({"kind": "acid_splash", "x": projectile["x"], "y": splash_y, "age": 0.0, "life": 0.42})
			effect_burst(projectile["x"], splash_y, Color("#84b343"), 6)
			add_stain("slime", float(projectile["x"]), 28.0)
			acid_pools.append({"x": projectile["x"], "radius": 50.0, "remaining": 5.0, "age": 0.0})
			projectiles.remove_at(index)

func update_grenades(delta: float) -> void:
	for index in range(grenades.size() - 1, -1, -1):
		var grenade := grenades[index]
		grenade["fuse"] -= delta
		grenade["x"] += float(grenade["vx"]) * delta
		grenade["y"] += float(grenade["vy"]) * delta
		grenade["vy"] += 620.0 * delta
		if grenade["y"] >= actor_ground() - 10.0:
			grenade["y"] = actor_ground() - 10.0
			grenade["vy"] = -absf(float(grenade["vy"])) * 0.28
			grenade["vx"] = float(grenade["vx"]) * 0.72
		if grenade["fuse"] <= 0.0:
			var x := clampf(float(grenade["x"]), 35.0, world_width - 35.0)
			for enemy in enemies:
				if not enemy["dead"] and absf(float(enemy["x"]) - x) < 160.0:
					damage_enemy(enemy, 80.0, x)
			explode_at(x, actor_ground() - 10.0, 160.0, 30, Color("#dba84d"))
			add_noise(60.0)
			grenades.remove_at(index)

func update_hazards(delta: float) -> void:
	for index in range(acid_pools.size() - 1, -1, -1):
		acid_pools[index]["remaining"] -= delta
		acid_pools[index]["age"] = float(acid_pools[index].get("age", 0.0)) + delta
		if acid_pools[index]["remaining"] <= 0.0:
			acid_pools.remove_at(index)
	hazard_clock -= delta
	if hazard_clock > 0.0:
		return
	hazard_clock = 0.8
	var contaminated := false
	for hazard in layout.get("hazards", []):
		if player_x >= float(hazard[0]) * scale_factor and player_x <= (float(hazard[0]) + float(hazard[2])) * scale_factor:
			contaminated = true
			break
	if not contaminated:
		for pool in acid_pools:
			if absf(player_x - float(pool["x"])) < float(pool["radius"]):
				contaminated = true
				break
	if contaminated and dodge_time <= 0.0:
		player_hit(3, false)
		infection = minf(100.0, infection + 2.0 * (1.0 - float(progression.effects()["infectionResistance"])))
		effect_burst(player_x, actor_ground() - 9.0, Color("#a5bb59"), 3)

func effect_burst(x: float, y: float, tint: Color, count: int) -> void:
	for index in count:
		effects.append({"x": x, "y": y, "vx": randf_range(-110.0, 110.0), "vy": randf_range(-180.0, -30.0), "life": randf_range(0.3, 0.8), "color": tint})

func add_stain(kind: String, x: float, radius: float) -> void:
	stains.append({"kind": kind, "x": x, "radius": radius * randf_range(0.8, 1.2), "seed": randf()})
	if stains.size() > 45:
		stains.pop_front()

func explode_at(x: float, y: float, radius: float, damage: int, tint: Color) -> void:
	audio.play_sfx("explosion")
	effect_burst(x, y, tint, 30)
	effects.append({"kind": "explosion", "x": x, "y": y, "age": 0.0, "life": 0.73})
	if absf(player_x - x) < radius:
		player_hit(damage, false)

func update_effects(delta: float) -> void:
	for index in range(effects.size() - 1, -1, -1):
		var effect := effects[index]
		effect["life"] -= delta
		if effect.get("kind") == "explosion" or effect.get("kind") == "acid_splash":
			effect["age"] += delta
		elif effect.get("kind") == "tracer":
			pass
		else:
			effect["x"] += effect["vx"] * delta
			effect["y"] += effect["vy"] * delta
			effect["vy"] += 380.0 * delta
		if effect["life"] <= 0.0:
			effects.remove_at(index)

func _process(delta: float) -> void:
	audio.music_mode = "menu" if menu_open or not started else ("ending" if ending_open else ("boss" if enemies.any(func(enemy: Dictionary) -> bool: return enemy["boss"] and not enemy["dead"]) else ("combat" if enemies.any(func(enemy: Dictionary) -> bool: return not enemy["dead"] and absf(float(enemy["x"]) - player_x) < 410.0) else "explore")))
	if not started:
		return
	audio.paused_game = paused
	update_player_death(delta)
	if not crafting.is_empty():
		update_crafting(delta)
	if paused:
		return
	scene_time += delta
	fire_timer = maxf(0.0, fire_timer - delta)
	if reload_timer > 0.0:
		reload_timer = maxf(0.0, reload_timer - delta)
		if reload_timer == 0.0:
			finish_reload()
	hit_timer = maxf(0.0, hit_timer - delta)
	muzzle_timer = maxf(0.0, muzzle_timer - delta)
	info_timer = maxf(0.0, info_timer - delta)
	update_checkpoint_banner(delta)
	if radio_timer > 0.0:
		radio_timer -= delta
		if radio_timer <= 0.0:
			show_next_radio()
	var axis := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		axis -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		axis += 1.0
	update_search(delta, axis)
	var effects := progression.effects()
	var gear := gear_stats()
	var sprint := Input.is_key_pressed(KEY_SHIFT) and axis != 0.0 and stamina > 0.0 and dodge_time <= 0.0
	if sprint:
		stamina = maxf(0.0, stamina - delta * 10.0 * float(gear["staminaCost"]))
	else:
		stamina = minf(100.0, stamina + delta * (5.0 if enemies.any(func(enemy: Dictionary) -> bool: return not enemy["dead"] and absf(float(enemy["x"]) - player_x) < 450.0) else 15.0))
	var speed := (PLAYER_RUN_SPEED if sprint else PLAYER_SPEED) * float(effects["moveSpeed"]) * float(gear["speed"])
	var old_x := player_x
	var dash_step := minf(delta, dodge_time) * 320.0 * dodge_direction
	dodge_time = maxf(0.0, dodge_time - delta)
	dodge_cooldown = maxf(0.0, dodge_cooldown - delta)
	player_x = clampf(player_x + axis * speed * delta + dash_step, 35.0, world_width - 35.0)
	player_moving = absf(player_x - old_x) > 0.01
	player_move_blend = lerpf(player_move_blend, 1.0 if player_moving else 0.0, minf(1.0, delta * 12.0))
	if player_moving:
		add_noise(absf(player_x - old_x) * (0.016 if sprint else 0.006) * float(gear["noise"]))
	if flashlight_on:
		battery = maxf(0.0, battery - delta * 0.3)
		if battery == 0.0:
			flashlight_on = false
	if infection > 0.0:
		infection = minf(100.0, infection + delta * 0.12 * (1.0 - float(effects["infectionResistance"])))
		var max_health := roundi(float(effects["maxHp"]) * (0.7 if infection >= 60.0 else (0.9 if infection >= 30.0 else 1.0)))
		health = mini(health, max_health)
		if infection >= 100.0:
			health = 0
			die()
			return
	update_noise(delta)
	var mouse_screen := get_viewport().get_mouse_position()
	var screen_size := get_viewport_rect().size
	var mouse_in_world := mouse_screen.x >= 0.0 and mouse_screen.x <= screen_size.x and mouse_screen.y >= 74.0 and mouse_screen.y <= screen_size.y - 44.0
	if mouse_in_world:
		update_aim(get_global_mouse_position(), delta)
	walk_distance += (player_x - old_x) * facing
	if mouse_in_world and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		shoot()
	for enemy in enemies.duplicate():
		update_enemy(enemy, delta, effects)
	update_projectiles(delta)
	update_grenades(delta)
	update_hazards(delta)
	update_traps(delta)
	update_effects(delta)
	current_action = nearest_action()
	var effective_max_hp := roundi(float(effects["maxHp"]) * (0.7 if infection >= 60.0 else (0.9 if infection >= 30.0 else 1.0)))
	if health > 0 and health < effective_max_hp and (int(effects["regeneration"]) > 0 or base_store.has_npc("medic")):
		regen_remainder += (float(effects["regeneration"]) + (1.0 if base_store.has_npc("medic") else 0.0)) * delta
		if regen_remainder >= 1.0:
			var healed := floori(regen_remainder)
			regen_remainder -= healed
			health = mini(effective_max_hp, health + healed)
	var action_prompt: String = current_action.get("prompt", "")
	prompt_label.set_hints(action_prompt.replace("E — ", "E|"))
	prompt_label.visible = searching.is_empty() and not action_prompt.is_empty()
	update_camera()
	refresh_hud()
	hotbar.queue_redraw()
	status_card.queue_redraw()
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if death_open:
			if player_death_age < PLAYER_DEATH_DURATION:
				return
			if event.keycode == KEY_ENTER:
				retry_checkpoint()
			elif event.keycode == KEY_B:
				return_to_base()
			return
		if encounter_view.visible:
			if event.keycode == KEY_ESCAPE:
				close_encounter()
			return
		if base_view.visible:
			if event.keycode == KEY_ESCAPE:
				show_main_menu()
			return
		if settings_open:
			if event.keycode == KEY_ESCAPE or event.keycode == KEY_M:
				settings_open = false
				settings_panel.visible = false
				if not menu_open:
					show_pause_panel()
			return
		if menu_open:
			match event.keycode:
				KEY_ENTER, KEY_ESCAPE:
					continue_game()
				KEY_N:
					start_new_game()
				KEY_Q:
					get_tree().quit()
				KEY_M:
					open_settings()
			return
		if ending_open:
			match event.keycode:
				KEY_1: select_ending(0)
				KEY_2: select_ending(1)
				KEY_3: select_ending(2)
				KEY_ENTER: complete_ending()
				KEY_ESCAPE: close_ending()
			return
		if journal_open:
			if event.keycode == KEY_J or event.keycode == KEY_ESCAPE:
				close_journal()
			return
		if progress_open:
			if event.keycode == KEY_P or event.keycode == KEY_ESCAPE:
				close_progress()
			elif event.keycode == KEY_ENTER:
				buy_selected_perk()
			return
		if inventory_view.shown:
			if event.keycode == KEY_I or event.keycode == KEY_TAB or event.keycode == KEY_ESCAPE:
				crafting.clear()
				inventory_view.close_bag()
				hotbar.visible = true
				paused = false
			elif event.keycode == KEY_R:
				if inventory_view.selected_uid != "":
					inventory_view.store.rotate_item(inventory_view.selected_uid)
					inventory_view.queue_redraw()
			return
		match event.keycode:
			KEY_P:
				if not paused:
					open_progress()
			KEY_J:
				if not paused:
					open_journal()
			KEY_I, KEY_TAB:
				if not paused:
					paused = true
					inventory_view.dna = dna
					inventory_view.open_bag()
					hotbar.visible = false
			KEY_ESCAPE:
				if paused:
					close_panel()
				else:
					show_pause_panel()
			KEY_M:
				if paused:
					open_settings()
			KEY_S:
				if paused and health > 0:
					save_game()
					show_panel("[center]ИГРА СОХРАНЕНА\n\nEsc — продолжить[/center]")
			KEY_N:
				if paused:
					start_new_game()
			KEY_Q:
				if paused:
					get_tree().quit()
				else:
					start_dodge()
			KEY_R:
				if not paused:
					reload_weapon()
			KEY_E:
				if not paused and health > 0:
					if searching.is_empty():
						interact()
					else:
						cancel_search()
			KEY_1, KEY_2, KEY_3, KEY_4:
				if not paused:
					hotbar.selected = event.keycode - KEY_1
					use_quick_slot(event.keycode - KEY_1)
			KEY_H:
				if not paused:
					use_type("medkit")
			KEY_G:
				if not paused:
					use_type("grenade")
			KEY_V:
				if not paused:
					knife_strike()
			KEY_F:
				if not paused and battery > 0.0:
					flashlight_on = not flashlight_on

func reset_run_state() -> void:
	world_states.clear()
	crafting.clear()
	cancel_search()
	encounter_state.clear()
	layout = {}
	scene_enemies.clear()
	scene_stains.clear()
	stains.clear()
	spent_containers.clear()
	container_remaining.clear()
	trap_states.clear()
	ambush_states.clear()
	active_traps.clear()
	dropped_items.clear()
	noise_events.clear()
	noise_warning = 0.0
	played_story.clear()
	radio_queue.clear()
	infection = 0.0
	stamina = 100.0
	battery = 100.0
	walk_distance = 0.0
	player_move_blend = 0.0
	facing = 1
	aim_angle = 0.0
	run_finished = false
	enemy_serial = 1
	revives_used = 0
	flashlight_on = false

func restore_checkpoint() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		reset_run_state()
		reset_inventory()
		health = 100
		layout = {}
		load_floor(51)
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	var saved: Variant = JSON.parse_string(file.get_as_text())
	if not saved is Dictionary:
		return
	world_states = saved.get("world", {}).duplicate(true)
	bag.restore(saved.get("inventory", {}))
	active_weapon_uid = saved.get("activeWeapon", "")
	equipment = saved.get("equipment", {"head": "", "torso": "", "hands": "", "feet": ""})
	dropped_items.assign(saved.get("drops", []))
	inventory_view.quick_slots.assign(saved.get("quickSlots", inventory_view.quick_slots))
	health = int(saved.get("health", 100))
	run_finished = bool(saved.get("finished", false))
	infection = float(saved.get("infection", 0))
	stamina = float(saved.get("stamina", 100))
	battery = float(saved.get("battery", 100))
	revives_used = int(saved.get("revivesUsed", 0))
	enemy_serial = int(saved.get("enemySerial", 1))
	var saved_floor := int(saved.get("floor", 51))
	layout = {}
	load_floor(saved_floor)
	var saved_room: String = saved.get("room", "")
	if saved_room != "" and maps[str(saved_floor)]["rooms"].has(saved_room):
		room_id = saved_room
		layout = maps[str(saved_floor)]["rooms"][room_id]
		update_dimensions()
		spawn_enemies()
	return_x = float(saved.get("returnX", return_x))
	player_x = clampf(float(saved.get("x", player_x)), 35.0, world_width - 35.0)
	hit_timer = 1.0
	sync_ammo()

func ray_box(origin: Vector2, direction: Vector2, rect: Rect2) -> float:
	var near := 0.0
	var far := 760.0
	if absf(direction.x) < 0.00001:
		if origin.x < rect.position.x or origin.x > rect.end.x:
			return -1.0
	else:
		var x1 := (rect.position.x - origin.x) / direction.x
		var x2 := (rect.end.x - origin.x) / direction.x
		near = maxf(near, minf(x1, x2))
		far = minf(far, maxf(x1, x2))
	if absf(direction.y) < 0.00001:
		if origin.y < rect.position.y or origin.y > rect.end.y:
			return -1.0
	else:
		var y1 := (rect.position.y - origin.y) / direction.y
		var y2 := (rect.end.y - origin.y) / direction.y
		near = maxf(near, minf(y1, y2))
		far = minf(far, maxf(y1, y2))
	return near if near <= far else -1.0

func shoot(aim_world: Vector2 = Vector2.INF) -> void:
	if fire_timer > 0.0 or reload_timer > 0.0 or health <= 0 or dodge_time > 0.0:
		return
	var weapon := weapon_item()
	if weapon.is_empty() or int(weapon.get("loaded", 0)) <= 0:
		fire_timer = 0.25
		return
	weapon["loaded"] = int(weapon["loaded"]) - 1
	var gun := bag.definition(weapon["type"])
	var category: String = gun.get("category", "shotgun" if int(gun.get("pellets", 1)) > 1 else "pistol")
	audio.play_sfx(category)
	var suppressor: bool = weapon.get("attachments", {}).get("muzzle", "") == "suppressor"
	add_noise(float(gun.get("noise", 40.0 if int(gun.get("pellets", 1)) > 1 else 20.0)) * (0.2 if suppressor else 1.0))
	var effects := progression.effects()
	fire_timer = float(gun.get("delay", 0.23)) / float(effects["fireRate"])
	muzzle_timer = 0.08
	var shoulder := player_shoulder()
	var aim := player_aim_vector() if aim_world == Vector2.INF else (aim_world - shoulder).normalized()
	if aim.length() < 0.1:
		aim = Vector2(facing, 0)
	var pellets := int(gun.get("pellets", 1))
	var shot_range := float(gun.get("range", 760.0))
	var shot_targets: Array[Dictionary] = []
	for enemy in enemies:
		if not enemy["dead"]:
			shot_targets.append(enemy)
	for pellet in pellets:
		var offset := 0.0 if pellets == 1 else (float(pellet) / float(pellets - 1) - 0.5) * float(gun.get("spread", 0.0))
		var ray := aim.rotated(offset)
		var hits: Array[Dictionary] = []
		for enemy in shot_targets:
			var height := 170.0 if enemy["boss"] else 125.0
			var width := 68.0 if enemy["boss"] else 52.0
			var box := Rect2(float(enemy["x"]) - width * 0.5, actor_ground() - height, width, height)
			var along := ray_box(shoulder, ray, box)
			if along >= 0.0 and along < shot_range:
				hits.append({"enemy": enemy, "distance": along, "relative": (actor_ground() - (shoulder.y + ray.y * along)) / height})
		hits.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a["distance"] < b["distance"])
		var limit := (2 if pellets > 1 else 1) + int(gun.get("penetration", 0)) + int(effects["penetration"])
		var travel := minf(shot_range, 680.0) if hits.is_empty() else float(hits[mini(limit, hits.size()) - 1]["distance"])
		self.effects.append({"kind": "tracer", "start": shoulder, "end": shoulder + ray * travel, "life": 0.17 if category == "heavy" else 0.11, "tint": "#5edce9" if category == "heavy" else "#e4c189"})
		for index in mini(limit, hits.size()):
			var enemy: Dictionary = hits[index]["enemy"]
			var falloff := maxf(0.35, 1.0 - float(hits[index]["distance"]) / maxf(920.0, shot_range * 1.3))
			var damage := float(gun.get("damage", 10)) * falloff * float(effects["gunDamage"])
			var relative := float(hits[index]["relative"])
			damage *= 2.0 * float(effects["headshotDamage"]) if relative > 0.77 else (0.5 if relative < 0.3 else 1.0)
			if randf() < float(effects["criticalChance"]) + (0.15 if weapon.get("attachments", {}).get("rail", "") == "laser" else 0.0):
				damage *= 2.0
			if effects.get("berserk", false) and health < float(effects["maxHp"]) * 0.3:
				damage *= 1.5
			damage_enemy(enemy, damage, shoulder.x)
			if relative < 0.3:
				enemy["slow_timer"] = maxf(float(enemy.get("slow_timer", 0.0)), 3.0)
	sync_ammo()

func damage_enemy(enemy: Dictionary, damage: float, from_x: float) -> void:
	if enemy["dead"]:
		return
	if enemy.get("surrendered", false):
		enemy["surrendered"] = false
	var old_hp := float(enemy["hp"])
	var incoming := signf(float(enemy["x"]) - from_x)
	var front := incoming == -int(enemy["face"])
	if front and enemy["type"] == "armored":
		damage *= 0.3
	if enemy["type"] == "carapace":
		damage *= 0.15 if front else 1.5
	if enemy["type"] == "chimera" and enemy["mutations"].has("armored"):
		damage *= 0.7
	if enemy["type"] == "chimera":
		enemy["regen_delay"] = 2.5
	enemy["hp"] = float(enemy["hp"]) - damage
	if enemy["type"] == "mama" and not enemy["surrendered_once"] and enemy["hp"] <= enemy["maxHp"] * 0.12:
		enemy["hp"] = maxf(1.0, enemy["hp"])
		enemy["surrendered"] = true
		enemy["surrendered_once"] = true
		play_radio_beat("mamaSurrender", true)
		return
	if enemy["type"] == "elena":
		for threshold in [0.5, 0.2]:
			if old_hp > enemy["maxHp"] * threshold and enemy["hp"] <= enemy["maxHp"] * threshold:
				for direction in [-1, 1]:
					var echo := make_enemy("elena_echo", clampf(float(enemy["x"]) + direction * 105.0, 35.0, world_width - 35.0))
					echo["hp"] = 40
					echo["ttl"] = 7.0
					enemies.append(echo)
				play_radio_beat("elenaEcho", true)
	if enemy["hp"] > 0.0:
		enemy["hit_time"] = 0.14
		enemy["hit_dir"] = signf(float(enemy["x"]) - from_x)
		if float(enemy.get("hit_fx_cooldown", 0.0)) <= 0.0:
			var armored_hit := front and ["armored", "carapace"].has(enemy["type"])
			effect_burst(enemy["x"], actor_ground() - (98.0 if enemy["boss"] else 67.0), Color("#d5ad70") if armored_hit else (Color("#8bad4b") if enemy["type"] == "spitter" else Color("#a74e42")), 4)
			enemy["hit_fx_cooldown"] = 0.09
	if enemy["hp"] <= 0.0:
		enemy["dead"] = true
		add_stain("slime" if enemy["type"] == "spitter" else "blood", enemy["x"], 27.0 if enemy["boss"] else 16.0)
		if enemy["type"] == "elena":
			for echo in enemies:
				if echo["type"] == "elena_echo":
					echo["dead"] = true
		audio.play_sfx("zombie")
		award_enemy(enemy["type"])
		effect_burst(enemy["x"], actor_ground() - 65.0, Color("#9b3c34"), 12)
		if enemy["boss"]:
			boss_supplies(enemy["x"])
			save_game()
		if enemy["type"] == "mama":
			play_radio_beat("mamaKilled", true)

func boss_supplies(x: float) -> void:
	var supplies := [{"type": "medkit", "qty": 1}, {"type": "ammo", "qty": 24}, {"type": "shells", "qty": 8}]
	for index in supplies.size():
		var drop: Dictionary = supplies[index]
		dropped_items.append({"layout": layout["id"], "x": clampf(x + (index - 1) * 43.0, 35.0, world_width - 35.0), "item": drop})
	inventory_view.notice = "БОСС ПОВЕРЖЕН · ЯЩИК СНАБЖЕНИЯ ОТКРЫТ"

func reload_weapon() -> void:
	if reload_timer > 0.0:
		return
	var weapon := weapon_item()
	if weapon.is_empty():
		return
	var gun := bag.definition(weapon["type"])
	var ammo_type: String = gun.get("ammo", "ammo")
	var amount := mini(bag.weapon_capacity(weapon) - int(weapon.get("loaded", 0)), bag.total(ammo_type))
	if amount > 0:
		reload_timer = (1.8 if gun.get("category", "") in ["shotgun", "heavy"] or weapon["type"] == "shotgun" else 1.2) / float(gear_stats()["reload"])
		reload_weapon_uid = weapon["uid"]
		audio.play_sfx("reload")
	sync_ammo()

func finish_reload() -> void:
	var weapon := bag.find_item(reload_weapon_uid)
	reload_weapon_uid = ""
	if weapon.is_empty():
		return
	var gun := bag.definition(weapon["type"])
	var ammo_type: String = gun.get("ammo", "ammo")
	var amount := mini(bag.weapon_capacity(weapon) - int(weapon.get("loaded", 0)), bag.total(ammo_type))
	if amount > 0 and bag.consume(ammo_type, amount):
		weapon["loaded"] = int(weapon["loaded"]) + amount
	sync_ammo()

func gear_stats() -> Dictionary:
	var stats := {"speed": 1.0, "reload": 1.0, "melee": 1.0, "noise": 1.0, "staminaCost": 1.0}
	for slot in equipment:
		var item := bag.find_item(equipment[slot])
		if item.is_empty():
			continue
		var info := bag.definition(item["type"])
		for key in info.get("modifiers", {}):
			if stats.has(key) and (float(item.get("durability", 0)) > 0.0 or float(info["modifiers"][key]) < 0.0):
				stats[key] = float(stats[key]) + float(info["modifiers"][key])
	var pack: Dictionary = catalog["backpacks"].get(bag.backpack, {})
	stats["speed"] = maxf(0.3, float(stats["speed"])) * float(pack.get("speed", 1.0))
	stats["noise"] = maxf(0.2, float(stats["noise"])) * float(pack.get("noise", 1.0))
	var limit := bag.weight_limit(maxf(0.0, float(progression.effects()["carryCapacity"]) - 18.0))
	if bag.equipped_weight() > limit:
		stats["speed"] = float(stats["speed"]) * 0.85
		stats["reload"] = float(stats["reload"]) * 0.9
		stats["staminaCost"] = 1.25
	return stats

func weapon_item() -> Dictionary:
	return bag.find_item(active_weapon_uid) if bag != null else {}

func sync_ammo() -> void:
	var weapon := weapon_item()
	ammo = int(weapon.get("loaded", 0))
	var gun := bag.definition(weapon.get("type", "pistol"))
	reserve = bag.total(gun.get("ammo", "ammo"))

func reset_inventory() -> void:
	bag.items.clear()
	bag.backpack = "pack_survivor"
	bag.sequence = 1
	equipment = {"head": "", "torso": "", "hands": "", "feet": ""}
	dropped_items.clear()
	for initial in catalog["starterInventory"]:
		bag.add_item(initial["type"], int(initial["qty"]), initial)
	active_weapon_uid = ""
	for item in bag.items:
		if item["type"] == "pistol":
			active_weapon_uid = item["uid"]
			break
	sync_ammo()

func use_inventory_item(uid: String) -> void:
	var item := bag.find_item(uid)
	if item.is_empty():
		return
	var info := bag.definition(item["type"])
	var max_health := roundi(float(progression.effects()["maxHp"]) * (0.7 if infection >= 60.0 else (0.9 if infection >= 30.0 else 1.0)))
	if info.has("heal") and health < max_health:
		health = mini(max_health, health + roundi(float(info["heal"]) * base_store.heal_multiplier()))
		if item["type"] == "medkit":
			infection = maxf(0.0, infection - 20.0)
		bag.consume(item["type"])
		audio.play_sfx("pickup")
		inventory_view.notice = "ЗДОРОВЬЕ ВОССТАНОВЛЕНО"
	elif item["type"] == "antidote":
		bag.consume("antidote")
		infection = 0.0
		inventory_view.notice = "ИНФЕКЦИЯ ПОДАВЛЕНА"
	elif item["type"] == "battery":
		bag.consume("battery")
		battery = minf(100.0, battery + 45.0)
		inventory_view.notice = "БАТАРЕЯ ЗАРЯЖЕНА"
	elif item["type"] == "flashlight":
		flashlight_on = not flashlight_on if battery > 0.0 else false
		inventory_view.notice = "ФОНАРЬ ВКЛЮЧЕН" if flashlight_on else "ФОНАРЬ ВЫКЛЮЧЕН"
	else:
		inventory_view.notice = "СЕЙЧАС НЕЛЬЗЯ ИСПОЛЬЗОВАТЬ"
	inventory_view.queue_redraw()

func use_type(type: String) -> void:
	for item in bag.items:
		if item["type"] == type:
			if type == "grenade":
				bag.consume("grenade")
				grenades.append({"x": player_x + facing * 16.0, "y": actor_ground() - 91.0, "vx": facing * 315.0, "vy": -245.0, "fuse": 1.15})
				audio.play_sfx("ui")
			else:
				use_inventory_item(item["uid"])
			return

func use_quick_slot(index: int) -> void:
	if index < 0 or index >= inventory_view.quick_slots.size():
		return
	var type: String = inventory_view.quick_slots[index]
	if type == "flashlight":
		flashlight_on = not flashlight_on if battery > 0.0 else false
		audio.play_sfx("ui")
		return
	var info := bag.definition(type)
	if info.get("group") == "weapon":
		for item in bag.items:
			if item["type"] == type:
				active_weapon_uid = item["uid"]
				sync_ammo()
				return
	elif type == "knife":
		knife_strike()
	else:
		use_type(type)

func knife_strike() -> void:
	if fire_timer > 0.0 or bag.total("knife") <= 0:
		return
	var cost := 15.0 * float(gear_stats()["staminaCost"])
	if stamina < cost:
		return
	stamina -= cost
	fire_timer = 0.35
	for enemy in enemies:
		if not enemy["dead"] and enemy["x"] * facing > player_x * facing and absf(enemy["x"] - player_x) < 78.0:
			damage_enemy(enemy, 15 * float(progression.effects()["meleeDamage"]) * float(gear_stats()["melee"]), player_x)
			break

func apply_hit(raw_damage: int) -> void:
	var defense := 0.0
	for slot in equipment:
		var item := bag.find_item(equipment[slot])
		if item.is_empty() or float(item.get("durability", 0)) <= 0:
			continue
		defense += float(bag.definition(item["type"]).get("defense", 0))
		item["durability"] = maxf(0.0, float(item["durability"]) - randi_range(1, 3))
	health = maxi(0, health - maxi(1, roundi(raw_damage * (1.0 - minf(defense, 0.9)) * float(progression.effects()["incomingDamage"]))))

func drop_inventory_item(uid: String) -> void:
	var item := bag.remove_item(uid)
	if item.is_empty():
		return
	dropped_items.append({"layout": layout["id"], "x": clampf(player_x + facing * 55.0, 35.0, world_width - 35.0), "item": item})
	for slot in equipment:
		if equipment[slot] == uid:
			equipment[slot] = ""
	if active_weapon_uid == uid:
		active_weapon_uid = ""
		for candidate in bag.items:
			if bag.definition(candidate["type"]).get("group") == "weapon":
				active_weapon_uid = candidate["uid"]
				break
	inventory_view.selected_uid = ""
	inventory_view.notice = "ПРИПАСЫ ОСТАВЛЕНЫ НА ПОЛУ"
	sync_ammo()
	inventory_view.queue_redraw()

func equip_inventory_item(uid: String) -> void:
	var item := bag.find_item(uid)
	if item.is_empty():
		return
	var info := bag.definition(item["type"])
	match info.get("group", ""):
		"weapon":
			active_weapon_uid = uid
			inventory_view.notice = "ОРУЖИЕ ВЗЯТО"
			sync_ammo()
		"armor":
			var slot: String = info.get("slot", "torso")
			equipment[slot] = "" if equipment.get(slot, "") == uid else uid
			inventory_view.notice = "ЗАЩИТА ИЗМЕНЕНА"
		"backpack":
			var old_pack := bag.backpack
			var snapshot := bag.serialize()
			bag.remove_item(uid)
			if bag.set_backpack(item["type"]) and bag.add_item(old_pack) == 0:
				inventory_view.selected_uid = ""
				inventory_view.notice = "РЮКЗАК ЗАМЕНЁН"
			else:
				bag.restore(snapshot)
				inventory_view.notice = "НЕ ХВАТАЕТ МЕСТА"
		_:
			inventory_view.notice = "ЭТО НЕЛЬЗЯ НАДЕТЬ"
	inventory_view.queue_redraw()

func change_attachment(uid: String) -> void:
	var item := bag.find_item(uid)
	if item.is_empty():
		return
	var kind: String = bag.definition(item["type"]).get("group", "")
	if kind == "attachment":
		if bag.install_attachment(uid, active_weapon_uid):
			inventory_view.selected_uid = active_weapon_uid
			inventory_view.notice = "ОБВЕС УСТАНОВЛЕН"
		else:
			inventory_view.notice = "НУЖНО ОРУЖИЕ И СВОБОДНЫЙ СЛОТ"
	elif kind == "weapon":
		var slots: Dictionary = item.get("attachments", {})
		var removed := false
		for slot in slots.keys():
			removed = bag.remove_attachment(uid, slot)
			break
		inventory_view.notice = "ОБВЕС СНЯТ" if removed else "НЕТ ОБВЕСА ИЛИ МЕСТА В РЮКЗАКЕ"
	else:
		inventory_view.notice = "ВЫБЕРИТЕ ОРУЖИЕ ИЛИ ОБВЕС"
	sync_ammo()
	inventory_view.queue_redraw()

func craft_inventory_item(recipe_id: String) -> void:
	if layout.get("zone") != "technical":
		inventory_view.notice = "ДЛЯ ИЗГОТОВЛЕНИЯ НУЖЕН ВЕРСТАК"
		inventory_view.queue_redraw()
		return
	if not crafting.is_empty():
		inventory_view.notice = "СНАЧАЛА ЗАВЕРШИТЕ ТЕКУЩЕЕ ИЗГОТОВЛЕНИЕ"
		inventory_view.queue_redraw()
		return
	var recipe: Dictionary = catalog["recipes"].get(recipe_id, {})
	if recipe.is_empty() or dna < int(recipe.get("dna", 0)):
		inventory_view.notice = "НЕ ХВАТАЕТ РЕСУРСОВ ИЛИ МЕСТА"
		inventory_view.queue_redraw()
		return
	for type in recipe["ingredients"]:
		if bag.total(type) < int(recipe["ingredients"][type]):
			inventory_view.notice = "НЕ ХВАТАЕТ РЕСУРСОВ"
			inventory_view.queue_redraw()
			return
	var target_uid := inventory_view.selected_uid
	if recipe.get("repair", false):
		var target := bag.find_item(target_uid)
		if target.is_empty() or bag.definition(target["type"]).get("group", "") != "armor" or float(target.get("durability", 100)) >= 100.0:
			inventory_view.notice = "ВЫБЕРИТЕ ПОВРЕЖДЁННУЮ БРОНЮ"
			inventory_view.queue_redraw()
			return
	var duration := maxf(0.5, float(recipe.get("seconds", 2)) * float(progression.effects()["craftTime"]) * base_store.craft_multiplier())
	crafting = {"id": recipe_id, "uid": target_uid, "remaining": duration, "duration": duration}
	inventory_view.notice = "ИЗГОТОВЛЕНИЕ · 0%"
	inventory_view.queue_redraw()

func update_crafting(delta: float) -> void:
	if crafting.is_empty():
		return
	crafting["remaining"] = maxf(0.0, float(crafting["remaining"]) - delta)
	var percent := roundi((1.0 - float(crafting["remaining"]) / float(crafting["duration"])) * 100.0)
	inventory_view.notice = "ИЗГОТОВЛЕНИЕ · %d%%" % percent
	if crafting["remaining"] <= 0.0:
		var recipe_id: String = crafting["id"]
		var recipe: Dictionary = catalog["recipes"].get(recipe_id, {})
		var worked := bag.repair_armor(crafting["uid"]) if recipe.get("repair", false) else bag.craft(recipe_id, dna)
		if worked:
			progression.spend(int(recipe.get("dna", 0)))
			dna = int(progression.profile["dna"])
			inventory_view.dna = dna
			inventory_view.notice = "СНАРЯЖЕНИЕ ВОССТАНОВЛЕНО" if recipe.get("repair", false) else "ПРЕДМЕТ ИЗГОТОВЛЕН"
			audio.play_sfx("pickup")
		else:
			inventory_view.notice = "ИЗГОТОВЛЕНИЕ НЕ УДАЛОСЬ · ПРОВЕРЬТЕ МЕСТО И РЕСУРСЫ"
		crafting.clear()
	inventory_view.queue_redraw()

func note_for_floor(number: int) -> Dictionary:
	for note in catalog.get("notes", []):
		if int(note["floor"]) == number:
			return note
	return {}

func open_journal(preferred_id := "") -> void:
	journal_open = true
	paused = true
	journal_backdrop.visible = true
	journal_list.clear()
	var selected := -1
	for note in catalog.get("notes", []):
		var found := journal_found.has(note["id"])
		var row := journal_list.item_count
		journal_list.add_item(note["title"] if found else "НЕИЗВЕСТНО")
		journal_list.set_item_disabled(row, not found)
		if found and (note["id"] == preferred_id or selected == -1):
			selected = row
	if selected >= 0:
		journal_list.select(selected)
		select_journal_entry(selected)
	else:
		journal_title.text = "ЗАПИСИ НЕ НАЙДЕНЫ"
		journal_author.text = "ОБЫСКИВАЙТЕ СТОЛЫ И ШКАФЫ"
		journal_body.text = "Найденные документы сохраняются после смерти и нового спуска."

func select_journal_entry(index: int) -> void:
	var notes: Array = catalog.get("notes", [])
	if index < 0 or index >= notes.size() or not journal_found.has(notes[index]["id"]):
		return
	var note: Dictionary = notes[index]
	journal_title.text = note["title"]
	journal_author.text = "ЭТАЖ %s · %s" % ["B1" if int(note["floor"]) == 0 else str(note["floor"]), note["author"]]
	journal_body.text = note["body"]

func close_journal() -> void:
	journal_open = false
	journal_backdrop.visible = false
	paused = false

func play_floor_story() -> void:
	var beat: String = catalog.get("floorStoryBeats", {}).get(str(floor_number), "")
	if beat != "":
		play_radio_beat(beat)

func play_radio_beat(beat: String, interrupt := false) -> void:
	if beat == "" or played_story.has(beat) or not catalog["storyBeats"].has(beat):
		return
	played_story[beat] = true
	if interrupt:
		radio_queue.clear()
	radio_queue.assign(catalog["storyBeats"].get(beat, []))
	show_next_radio()

func show_next_radio() -> void:
	if radio_queue.is_empty():
		radio_panel.visible = false
		radio_timer = 0.0
		return
	var line: Dictionary = radio_queue.pop_front()
	radio_speaker.text = line["speaker"]
	radio_message.text = line["text"]
	radio_timer = clampf(line["text"].length() / 18.0, 3.7, 6.0)
	radio_panel.visible = true

func open_progress() -> void:
	progress_open = true
	paused = true
	progress_backdrop.visible = true
	perk_list.clear()
	for id in perk_ids:
		var info: Dictionary = catalog["perks"][id]
		perk_list.add_item("%s · %d/3" % [info["name"], progression.rank(id)])
	progress_heading.text = "УЛУЧШЕНИЯ · ДНК %d" % dna
	perk_list.select(0)
	select_perk(0)

func select_perk(index: int) -> void:
	if index < 0 or index >= perk_ids.size():
		return
	var id := perk_ids[index]
	var info: Dictionary = catalog["perks"][id]
	var level := progression.rank(id)
	perk_title.text = info["name"]
	perk_detail.text = "%s\n\nВЕТКА: %s\nТЕКУЩИЙ РАНГ: %d / 3\n\n%s" % [info["name"], info["branch"], level, info["description"]]
	if level < 3:
		perk_detail.text += "\n\nСЛЕДУЮЩИЙ РАНГ: %d ДНК" % int(info["costs"][level])
	else:
		perk_detail.text += "\n\nМАКСИМАЛЬНЫЙ РАНГ"

func buy_selected_perk() -> void:
	var index := perk_list.get_selected_items()[0] if not perk_list.get_selected_items().is_empty() else -1
	if index < 0:
		return
	if progression.buy(perk_ids[index]):
		dna = int(progression.profile["dna"])
		var info: Dictionary = catalog["perks"][perk_ids[index]]
		perk_list.set_item_text(index, "%s · %d/3" % [info["name"], progression.rank(perk_ids[index])])
		progress_heading.text = "УЛУЧШЕНИЯ · ДНК %d" % dna
		select_perk(index)

func close_progress() -> void:
	progress_open = false
	progress_backdrop.visible = false
	paused = false

func award_enemy(type: String) -> void:
	var earned := progression.award(type)
	if base_store.has_npc("trader") and earned > 0:
		progression.profile["dna"] = int(progression.profile["dna"]) + maxi(1, roundi(earned * 0.1))
		progression.save_profile()
	dna = int(progression.profile["dna"])

func nearest_action() -> Dictionary:
	var best := {}
	var distance := 90.0
	var targets: Array = []
	if room_id != "":
		targets.append({"type": "exit", "rect": layout["exit"]["rect"], "prompt": "E — ВЕРНУТЬСЯ НА ЭТАЖ"})
	else:
		for door in layout.get("doors", []):
			var door_prompt := "E — ВОЙТИ: %s" % door["name"]
			if not encounter_state.is_empty() and not bool(encounter_state.get("resolved", false)) and str(door["id"]) == str(encounter_state.get("room", "")):
				door_prompt += " · СЛЫШЕН ГОЛОС"
			targets.append({"type": "door", "id": door["id"], "rect": door["rect"], "prompt": door_prompt})
		if layout.has("lift"):
			var lift_prompt := "E — СПУСТИТЬСЯ НА ЭТАЖ НИЖЕ"
			if BOSS_FLOORS.has(floor_number) and not boss_defeated():
				lift_prompt = "ЛИФТ ЗАБЛОКИРОВАН · ПОБЕДИТЕ БОССА"
			elif floor_number == 0:
				lift_prompt = "E — ВЫБРАТЬ КОНЦОВКУ"
			targets.append({"type": "lift", "rect": layout["lift"]["rect"], "prompt": lift_prompt})
		for enemy in enemies:
			if enemy["type"] == "mama" and enemy["surrendered"]:
				targets.append({"type": "spare", "rect": [float(enemy["x"]) / scale_factor - 15.0, 0, 30, 20], "prompt": "E — ПОЩАДИТЬ МАМУ"})
	if not encounter_state.is_empty() and not bool(encounter_state.get("resolved", false)) and room_id == str(encounter_state.get("room", "")):
		targets.append({"type": "survivor", "rect": [float(encounter_state["x"]) / scale_factor - 18.0, 0, 36, 20], "prompt": "E — ПОГОВОРИТЬ: %s" % encounter_state["name"]})
	for container in layout.get("containers", []):
		var key := "%s:%s" % [layout["id"], container["id"]]
		if not spent_containers.has(key):
			targets.append({"type": "loot", "key": key, "container": container, "rect": container["rect"], "prompt": "E — ОБЫСКАТЬ: %s" % container["label"]})
	for index in enemies.size():
		var enemy: Dictionary = enemies[index]
		if enemy["dead"] and not enemy["boss"] and enemy["type"] != "elena_echo" and not enemy.get("searched", false):
			targets.append({"type": "corpse", "index": index, "rect": [float(enemy["x"]) / scale_factor - 12.0, 0, 24, 20], "prompt": "E — ОБЫСКАТЬ ТРУП"})
	for index in dropped_items.size():
		var drop := dropped_items[index]
		if drop["layout"] == layout["id"]:
			var dropped_item: Dictionary = drop["item"]
			var item_name: String = bag.definition(str(dropped_item["type"])).get("name", str(dropped_item["type"]))
			var item_count := int(dropped_item.get("qty", 1))
			var drop_prompt := "E — ПОДОБРАТЬ: %s" % item_name
			if item_count > 1:
				drop_prompt += " ×%d" % item_count
			targets.append({"type": "drop", "index": index, "rect": [float(drop["x"]) / scale_factor - 8.0, 0, 16, 16], "prompt": drop_prompt})
	for target in targets:
		var rect: Array = target["rect"]
		var x := (float(rect[0]) + float(rect[2]) * 0.5) * scale_factor
		var gap := absf(player_x - x)
		if gap < distance:
			distance = gap
			best = target
	if room_id != "" and not encounter_state.is_empty() and room_id == str(encounter_state.get("room", "")) and not bool(encounter_state.get("resolved", false)):
		if absf(player_x - float(encounter_state["x"])) < 125.0:
			best = {"type": "survivor", "prompt": "E — ПОГОВОРИТЬ: %s" % encounter_state["name"]}
			distance = 40.0
	for trap in active_traps:
		if trap["layout"] != layout["id"] or trap["status"] != "warning":
			continue
		var rect: Array = trap["rect"]
		var x := (float(rect[0]) + float(rect[2]) * 0.5) * scale_factor
		var gap := absf(player_x - x)
		if gap <= distance:
			distance = gap
			best = {"type": "trap", "key": trap["key"], "prompt": "E — ОБЕЗВРЕДИТЬ: %s" % catalog["traps"][trap["type"]]["name"]}
	if best.get("type") == "loot" and int(progression.effects()["inspection"]) > 0:
		var contents := prepare_container_contents(best["key"], best["container"])
		var rank := int(progression.effects()["inspection"])
		var labels: Array[String] = []
		for index in mini(contents.size(), 1 if rank == 1 else 9):
			var item: Dictionary = contents[index]
			var title: String = bag.definition(item["type"]).get("name", item["type"])
			if rank >= 3:
				title += " ×%d" % int(item["qty"])
				if item.has("durability"):
					title += " · %d%%" % int(item["durability"])
			labels.append(title)
		best["prompt"] += "  ·  " + (" / ".join(labels) if not labels.is_empty() else "ПУСТО")
	return best

func prepare_container_contents(key: String, container: Dictionary) -> Array:
	if container_remaining.has(key):
		return container_remaining[key]
	var contents: Array = container.get("loot", []).duplicate(true)
	var bonus_types: Array = container.get("bonusTypes", [])
	var bonus := mini(bonus_types.size(), mini(6, int(progression.effects()["lootBonus"])))
	for index in bonus:
		var type: String = bonus_types[index]
		var stacked := false
		for item in contents:
			if item["type"] == type:
				item["qty"] = int(item["qty"]) + 1
				stacked = true
				break
		if not stacked:
			contents.append({"type": type, "qty": 1})
	var rare := str(mini(60, int(progression.effects()["rareLootBonus"]) + base_store.rare_bonus()))
	for item in container.get("rareByBonus", {}).get(rare, []):
		contents.append(item.duplicate(true))
	container_remaining[key] = contents
	return contents

func open_encounter() -> void:
	if encounter_state.is_empty() or bool(encounter_state.get("resolved", false)) or room_id != str(encounter_state.get("room", "")):
		return
	paused = true
	encounter_view.show_event(encounter_state, bag, dna, base_store)

func resolve_encounter(index: int) -> void:
	if encounter_state.is_empty() or bool(encounter_state.get("resolved", false)):
		return
	var choices: Array = encounter_state["choices"]
	if index < 0 or index >= choices.size():
		return
	var choice: Dictionary = choices[index]
	var need := int(choice.get("cost_qty", 1))
	if choice.has("cost_item") and bag.total(str(choice["cost_item"])) < need:
		return
	if dna < int(choice.get("cost_dna", 0)) or (choice.has("recruit") and base_store.has_npc(str(choice["recruit"]))):
		return
	if choice.has("cost_item"):
		bag.consume(str(choice["cost_item"]), need)
	if int(choice.get("cost_dna", 0)) > 0:
		progression.spend(int(choice["cost_dna"]))
	if int(choice.get("reward_dna", 0)) > 0:
		progression.profile["dna"] = int(progression.profile["dna"]) + int(choice["reward_dna"])
		progression.save_profile()
	if choice.has("reward_item"):
		var leftover := bag.add_item(str(choice["reward_item"]), int(choice.get("reward_qty", 1)))
		if leftover > 0:
			dropped_items.append({"layout": layout["id"], "x": float(encounter_state["x"]), "item": {"type": str(choice["reward_item"]), "qty": leftover}})
	if choice.has("recruit"):
		base_store.recruit(str(choice["recruit"]))
	if int(choice.get("morale", 0)) != 0:
		base_store.change_morale(int(choice["morale"]))
	infection = clampf(infection + float(choice.get("infection", 0)), 0.0, 100.0)
	dna = int(progression.profile["dna"])
	encounter_state["resolved"] = true
	save_game()
	encounter_view.show_result(str(choice.get("result", "")))

func close_encounter() -> void:
	encounter_view.visible = false
	paused = false
	current_action = nearest_action()
	queue_redraw()

func interact() -> void:
	match current_action.get("type", ""):
		"survivor":
			open_encounter()
		"door":
			audio.play_sfx("door")
			cancel_search()
			projectiles.clear()
			grenades.clear()
			effects.clear()
			remember_scene()
			return_x = player_x
			room_id = current_action["id"]
			layout = maps[str(floor_number)]["rooms"][room_id]
			update_dimensions()
			player_x = minf(world_width * 0.5, 185.0)
			update_camera()
			spawn_enemies()
		"exit":
			audio.play_sfx("door")
			cancel_search()
			projectiles.clear()
			grenades.clear()
			effects.clear()
			remember_scene()
			room_id = ""
			layout = maps[str(floor_number)]
			update_dimensions()
			player_x = return_x
			update_camera()
			spawn_enemies()
		"lift":
			if BOSS_FLOORS.has(floor_number) and not boss_defeated():
				return
			if floor_number > 0:
				audio.play_sfx("door")
				load_floor(0 if floor_number == 2 else floor_number - 1)
				if floor_number % 5 == 0 and save_game():
					show_checkpoint_banner()
			elif boss_defeated():
				open_ending()
		"spare":
			for enemy in enemies:
				if enemy["type"] == "mama" and enemy["surrendered"]:
					enemy["dead"] = true
					enemy["spared"] = true
					award_enemy("mama")
					bag.add_item("antidote", 1)
					boss_supplies(enemy["x"])
					save_game()
					play_radio_beat("mamaSpared", true)
					break
		"loot":
			start_search(current_action)
		"corpse":
			var enemy: Dictionary = enemies[int(current_action["index"])]
			if not enemy.has("corpse_loot"):
				var pool := ["ammo", "cloth", "green", "metal", "bandage"]
				enemy["corpse_loot"] = [{"type": pool[int(enemy.get("id", 0)) % pool.size()], "qty": 1}]
			var container := {"id": "corpse-%s" % enemy.get("id", 0), "label": "ТРУП ЗАРАЖЁННОГО", "search": {"seconds": 1.5, "noise": 0}, "loot": enemy["corpse_loot"], "rect": [float(enemy["x"]) / scale_factor - 12.0, 0, 24, 20]}
			start_search({"type": "corpse", "key": "%s:%s" % [layout["id"], container["id"]], "container": container, "corpseId": enemy.get("id", 0)})
		"trap":
			for trap in active_traps:
				if trap["key"] == current_action["key"] and trap["status"] == "warning":
					trap["status"] = "disarmed"
					trap_states[trap["key"]] = "disarmed"
					audio.play_sfx("ui")
					inventory_view.notice = "ЛОВУШКА ОБЕЗВРЕЖЕНА"
					break
		"drop":
			var drop: Dictionary = dropped_items[int(current_action["index"])]
			var item: Dictionary = drop["item"]
			var requested := int(item["qty"])
			var leftover := bag.add_item(item["type"], requested, item)
			if leftover == requested:
				inventory_view.notice = "РЮКЗАК ПОЛОН"
				return
			if leftover == 0:
				dropped_items.remove_at(int(current_action["index"]))
				inventory_view.notice = "ПРИПАСЫ ПОДОБРАНЫ"
			else:
				item["qty"] = leftover
				inventory_view.notice = "ЧАСТЬ ПРИПАСОВ ОСТАЛАСЬ НА ПОЛУ"
			audio.play_sfx("pickup")
			sync_ammo()

func start_search(action: Dictionary) -> void:
	var container: Dictionary = action["container"]
	var seconds := maxf(0.35, float(container.get("search", {}).get("seconds", 2.0)) * float(progression.effects()["searchTime"]))
	searching = {"key": action["key"], "container": container, "elapsed": 0.0, "duration": seconds, "origin": player_x, "layout": layout["id"]}
	if action.has("corpseId"):
		searching["corpseId"] = action["corpseId"]
	search_label.text = "ОБЫСК · %s" % container["label"]
	search_bar.value = 0
	search_bar.visible = true
	search_label.visible = true
	add_noise(float(container.get("search", {}).get("noise", 0)) * float(progression.effects()["searchNoise"]))

func update_search(delta: float, axis: float) -> void:
	if searching.is_empty():
		return
	if axis != 0.0 or absf(player_x - float(searching["origin"])) > 1.0 or searching["layout"] != layout["id"]:
		cancel_search()
		return
	searching["elapsed"] += delta
	search_bar.value = minf(100.0, float(searching["elapsed"]) / float(searching["duration"]) * 100.0)
	if searching["elapsed"] >= searching["duration"]:
		var result := searching.duplicate(true)
		cancel_search()
		finish_search(result)

func cancel_search() -> void:
	searching.clear()
	if is_node_ready():
		search_bar.visible = false
		search_label.visible = false

func finish_search(result: Dictionary) -> void:
	var key: String = result["key"]
	var container: Dictionary = result["container"]
	trigger_container_hazards(container)
	if container["id"] == "landmark-%d" % floor_number:
		var note := note_for_floor(floor_number)
		if not note.is_empty() and not journal_found.has(note["id"]):
			journal_found.append(note["id"])
			if not test_mode:
				var journal_file := FileAccess.open("user://lift_journal.json", FileAccess.WRITE)
				if journal_file != null:
					journal_file.store_string(JSON.stringify(journal_found))
			open_journal(note["id"])
			return
	var contents: Array = prepare_container_contents(key, container)
	var remaining: Array = []
	for index in contents.size():
		var loot: Dictionary = contents[index]
		var quantity := int(loot["qty"])
		var leftover := bag.add_item(loot["type"], quantity, loot)
		if leftover > 0:
			var held: Dictionary = loot.duplicate(true)
			held["qty"] = leftover
			remaining.append(held)
	container_remaining[key] = remaining
	if result.has("corpseId") and remaining.is_empty():
		for enemy in enemies:
			if enemy.get("id", -1) == result["corpseId"]:
				enemy["searched"] = true
				break
	audio.play_sfx("pickup")
	if remaining.is_empty():
		spent_containers[key] = true
	inventory_view.notice = "ПРИПАСЫ ПОЛУЧЕНЫ" if remaining.is_empty() else "РЮКЗАК ПОЛОН · ОСТАТОК В КОНТЕЙНЕРЕ"
	sync_ammo()

func trigger_container_hazards(container: Dictionary) -> void:
	var trap: Variant = container.get("trap")
	var key := "%s:%s" % [layout["id"], container["id"]]
	if trap is Dictionary and not trap_states.has(key):
		if progression.rank("sapper") >= 3:
			trap_states[key] = "disarmed"
		else:
			trap_states[key] = "warning"
			active_traps.append({"key": key, "layout": layout["id"], "type": trap["type"], "rect": container["rect"], "status": "warning", "remaining": 0.5, "gasRemaining": 0.0, "gasClock": 0.0})
			inventory_view.notice = "ЛОВУШКА! E — ОБЕЗВРЕДИТЬ"
	var ambush: Variant = container.get("ambush")
	if ambush is Dictionary and not ambush_states.has(key):
		ambush_states[key] = "triggered"
		enemies.append(make_enemy("runner", clampf(player_x + 100.0 * facing, 35.0, world_width - 35.0)))

func update_traps(delta: float) -> void:
	for trap in active_traps:
		if trap["layout"] != layout["id"]:
			continue
		if trap["status"] == "warning":
			trap["remaining"] -= delta
			if trap["remaining"] <= 0.0:
				trap["status"] = "spent"
				trap_states[trap["key"]] = "spent"
				var info: Dictionary = catalog["traps"].get(trap["type"], {})
				add_noise(float(info.get("noise", 0)))
				var rect: Array = trap["rect"]
				var x := (float(rect[0]) + float(rect[2]) * 0.5) * scale_factor
				effect_burst(x, actor_ground() - 25.0, Color(info.get("color", "#b9a067")), 18)
				var resistance := 1.0
				if trap["type"] == "shock":
					resistance -= float(progression.effects()["shockResistance"])
				elif trap["type"] == "gas":
					resistance -= float(progression.effects()["gasResistance"])
				var damage := roundi(float(info.get("damage", 0)) * float(progression.effects()["trapFactor"]) * resistance)
				if damage > 0 and absf(player_x - x) < float(info.get("radius", 100)):
					player_hit(damage, false)
				if trap["type"] == "gas":
					trap["gasRemaining"] = 5.0
		if trap["status"] == "spent" and trap["gasRemaining"] > 0.0:
			trap["gasRemaining"] = maxf(0.0, float(trap["gasRemaining"]) - delta)
			trap["gasClock"] += delta
			if trap["gasClock"] >= 1.0:
				trap["gasClock"] -= 1.0
				var center: Array = trap["rect"]
				var position := (float(center[0]) + float(center[2]) * 0.5) * scale_factor
				var gas_damage := roundi(4.0 * (1.0 - float(progression.effects()["gasResistance"])))
				if gas_damage > 0 and absf(player_x - position) < 110.0:
					player_hit(gas_damage, false)

func show_checkpoint_banner() -> void:
	checkpoint_detail.text = "БУНКЕР B1 · ПРОДОЛЖИТЬ ОТСЮДА" if floor_number == 0 else "ЭТАЖ %d · ПРОДОЛЖИТЬ ОТСЮДА" % floor_number
	checkpoint_timer = 3.6
	checkpoint_banner.modulate.a = 0.0
	checkpoint_banner.visible = true
	audio.play_sfx("ui")

func update_checkpoint_banner(delta: float) -> void:
	if checkpoint_timer <= 0.0:
		return
	checkpoint_timer = maxf(0.0, checkpoint_timer - delta)
	checkpoint_banner.modulate.a = minf(1.0, minf((3.6 - checkpoint_timer) / 0.22, checkpoint_timer / 0.45))
	if checkpoint_timer == 0.0:
		checkpoint_banner.visible = false

func save_game() -> bool:
	if test_mode:
		return false
	remember_scene()
	world_states[str(floor_number)] = snapshot_floor()
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify({"floor": floor_number, "room": room_id, "x": player_x, "returnX": return_x, "health": health, "finished": run_finished, "infection": infection, "stamina": stamina, "battery": battery, "revivesUsed": revives_used, "enemySerial": enemy_serial, "ammo": ammo, "reserve": reserve, "dna": dna, "inventory": bag.serialize(), "activeWeapon": active_weapon_uid, "equipment": equipment, "drops": dropped_items, "quickSlots": inventory_view.quick_slots, "world": world_states}))
	return file.get_error() == OK

func show_panel(copy: String) -> void:
	paused = true
	radio_panel.visible = false
	menu_overlay.visible = false
	menu_backdrop.visible = false
	panel.visible = true
	panel_text.text = copy

func show_pause_panel() -> void:
	menu_open = false
	paused = true
	radio_panel.visible = false
	menu_backdrop.visible = true
	menu_overlay.visible = true
	panel.visible = false
	continue_button.text = "ПРОДОЛЖИТЬ"
	menu_subtitle.text = "ПАУЗА · %s" % layout.get("title", "")
	save_button.visible = true
	menu_button.visible = true
	$HUD/MenuOverlay/MenuButtons/BaseButton.visible = false

func open_settings() -> void:
	audio.play_sfx("ui")
	settings_open = true
	settings_panel.visible = true
	paused = true
	panel.visible = false

func close_panel() -> void:
	paused = false
	radio_panel.visible = radio_timer > 0.0 and not radio_message.text.is_empty()
	panel.visible = false
	menu_overlay.visible = false
	menu_backdrop.visible = false

func boss_defeated() -> bool:
	for enemy in enemies:
		if enemy["boss"] and not enemy["dead"]:
			return false
	return true

func open_ending() -> void:
	if ending_data.is_empty() or run_finished:
		return
	ending_open = true
	paused = true
	ending_backdrop.visible = true
	select_ending(0)

func select_ending(index: int) -> void:
	selected_ending = index
	var id: String = ending_ids[index]
	var data: Dictionary = ending_data[id]
	ending_title.text = data["title"]
	ending_image.texture = load("res://assets/ending_%s.webp" % id)
	ending_story.text = "\n\n".join(data["paragraphs"])
	ending_story.scroll_to_line(0)

func complete_ending() -> void:
	if run_finished:
		return
	var id: String = ending_ids[selected_ending]
	run_finished = true
	base_store.collect_run_supplies(bag.items, catalog)
	if not completed_endings.has(id):
		completed_endings.append(id)
	progression.profile["wins"] = int(progression.profile["wins"]) + 1
	progression.save_profile()
	if not test_mode:
		var save := FileAccess.open("user://lift_endings.json", FileAccess.WRITE)
		if save != null:
			save.store_string(JSON.stringify(completed_endings))
	save_game()
	$HUD/EndingBackdrop/EndingHelp.set_hints("ESC|В ГЛАВНОЕ МЕНЮ")

func close_ending() -> void:
	ending_open = false
	paused = false
	ending_backdrop.visible = false
	$HUD/EndingBackdrop/EndingHelp.set_hints("1|ЭВАКУАЦИЯ;2|СПАСЕНИЕ;3|ИСТИНА;ENTER|ПОДТВЕРДИТЬ;ESC|НАЗАД")
	if run_finished:
		show_main_menu()

func refresh_hud() -> void:
	if bag != null:
		sync_ammo()
	var title := "КРЫША" if floor_number == 51 else ("БУНКЕР B1" if floor_number == 0 else "%d ЭТАЖ" % floor_number)
	floor_label.text = "ЛИФТ В АД  ·  %s  ·  %s" % [title, layout.get("title", "")]
	status_label.text = "ПАТРОНЫ %s  ·  ДНК %d" % ["ПЕРЕЗАРЯДКА" if reload_timer > 0.0 else "%d/%d" % [ammo, reserve], dna]

func _draw() -> void:
	if not started:
		return
	draw_distant_windows()
	draw_atmosphere()
	draw_floor_damage()
	draw_room_lighting()
	draw_foreground_props("back")
	draw_apocalypse_props("back")
	if room_id != "" and not encounter_state.is_empty() and room_id == str(encounter_state.get("room", "")) and not bool(encounter_state.get("resolved", false)):
		var encounter_x := float(encounter_state["x"])
		draw_ground_ellipse(encounter_x, actor_ground() - 4.0, 19.0, 4.0, Color("#02080a99"))
		var portrait_index := int(encounter_state["portrait"])
		var idle_phase := scene_time * 1.5 + portrait_index * 1.13
		var idle_lean := sin(idle_phase * 0.73) * 0.004
		var idle_breath := 1.0 + sin(idle_phase) * 0.008
		draw_set_transform(Vector2(encounter_x, actor_ground()), idle_lean, Vector2(1.0, idle_breath))
		if portrait_index < 8:
			var people: Texture2D = textures["survivor_idle"]
			var cell := Vector2(people.get_width() / 4.0, people.get_height() / 2.0)
			var source := Rect2(float(portrait_index % 4) * cell.x, float(portrait_index / 4) * cell.y, cell.x, cell.y)
			draw_texture_rect_region(people, Rect2(-42.0, -136.0, 84.0, 136.0), source)
		else:
			var dog: Texture2D = textures["survivor_dog"]
			draw_texture_rect(dog, Rect2(-55.0, -88.0, 110.0, 88.0), false)
		draw_set_transform_matrix(Transform2D.IDENTITY)
		draw_circle(Vector2(encounter_x, actor_ground() - 172.0), 12.0, Color("#b9985d"))
		draw_string(ThemeDB.fallback_font, Vector2(encounter_x - 5.0, actor_ground() - 166.0), "!", HORIZONTAL_ALIGNMENT_LEFT, 10, 16, Color("#1b2423"))
	for stain in stains:
		var tint := Color("#7c403388") if stain["kind"] == "blood" else Color("#809b45a0")
		draw_ground_ellipse(float(stain["x"]), actor_ground() - 5.0, float(stain["radius"]), 4.0 + float(stain["seed"]) * 2.0, tint)
	draw_foreground_props("front")
	draw_apocalypse_props("front")
	for enemy in enemies:
		if not enemy["dead"]:
			draw_ground_ellipse(float(enemy["x"]), actor_ground() - 4.0, 24.0 if enemy["boss"] else 15.0, 3.0, Color("#02080a99"))
	draw_ground_ellipse(player_x, actor_ground() - 4.0, 19.0, 4.0, Color("#02080abb"))
	for trap in active_traps:
		if trap["layout"] != layout["id"]:
			continue
		var rect: Array = trap["rect"]
		var x := (float(rect[0]) + float(rect[2]) * 0.5) * scale_factor
		if trap["status"] == "warning":
			draw_rect(Rect2(x - 29.0, actor_ground() - 164.0, 58.0, 5.0), Color("#29373a"))
			draw_rect(Rect2(x - 29.0, actor_ground() - 164.0, 58.0 * clampf(float(trap["remaining"]) / 0.5, 0.0, 1.0), 5.0), Color("#e8a85c"))
		elif float(trap["gasRemaining"]) > 0.0:
			for plume in 4:
				var rise := fposmod(scene_time * (22.0 + plume * 4.0) + plume * 31.0, 80.0)
				draw_circle(Vector2(x - 33.0 + plume * 22.0 + sin(scene_time + plume) * 6.0, actor_ground() - 20.0 - rise), 13.0 + plume * 2.0, Color("#9aaf6240"))
	for drop in dropped_items:
		if drop["layout"] == layout["id"]:
			var drop_x := float(drop["x"])
			var item: Dictionary = drop["item"]
			var info: Dictionary = catalog["items"].get(str(item["type"]), {})
			var sheet: String = info.get("sheet", "loot")
			if int(info.get("icon", -1)) < 0:
				sheet = "gear"
			var icon: Texture2D = inventory_view.icons.get(sheet)
			draw_line(Vector2(drop_x, actor_ground() - 17.0), Vector2(drop_x, actor_ground() - 4.0), Color("#ad916088"), 1.0)
			draw_circle(Vector2(drop_x, actor_ground() - 35.0), 20.0, Color("#101d1bed"))
			draw_arc(Vector2(drop_x, actor_ground() - 35.0), 20.0, 0.0, TAU, 24, Color("#ad9160"), 1.5)
			if icon != null:
				var columns := int(info.get("sheetColumns", 2 if info.has("sheet") or int(info.get("icon", 0)) < 0 else 4))
				var rows := int(info.get("sheetRows", columns))
				var icon_index := maxi(0, int(info.get("icon", 0)))
				var source := Rect2((icon_index % columns) * icon.get_width() / float(columns), (icon_index / columns) * icon.get_height() / float(rows), icon.get_width() / float(columns), icon.get_height() / float(rows))
				draw_texture_rect_region(icon, Rect2(drop_x - 16.0, actor_ground() - 51.0, 32.0, 32.0), source)
			if int(item.get("qty", 1)) > 1:
				draw_string(ThemeDB.fallback_font, Vector2(drop_x + 7.0, actor_ground() - 12.0), str(item["qty"]), HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color("#f4d693"))
	for enemy in enemies:
		var hit_ratio := clampf(float(enemy.get("hit_time", 0.0)) / 0.14, 0.0, 1.0) if not enemy["dead"] else 0.0
		var hit_offset := float(enemy.get("hit_dir", 0.0)) * hit_ratio * (2.0 if enemy["boss"] else 3.5)
		var hit_tint := Color(1.0, 1.0 - hit_ratio * 0.25, 1.0 - hit_ratio * 0.3)
		if enemy["type"] == "elena_echo":
			hit_tint.a = 0.65
		draw_actor(enemy["type"], float(enemy["x"]) + hit_offset, enemy["walk"], enemy["face"], enemy["death_time"] if enemy["dead"] else -1.0, false, enemy["attack_time"], enemy["attack_kind"], bool(enemy["surrendered"]), float(enemy.get("attack_duration", 1.2)), hit_tint)
		if enemy["boss"] and not enemy["dead"]:
			var width := 182.0
			var x := float(enemy["x"]) - width * 0.5
			var y := actor_ground() - 215.0
			var title: String = {"matriarch": "ТОЛСТЯК-МАТКА", "alpha": "КРИКУН-АЛЬФА", "carapace": "БРОНЕНОСЕЦ", "chimera": "ХИМЕРА", "mama": "МАМА", "elena": "ЕЛЕНА?", "boss": "ОБЪЕКТ 0"}.get(enemy["type"], enemy["type"])
			draw_string(ThemeDB.fallback_font, Vector2(x, y - 7.0), title, HORIZONTAL_ALIGNMENT_CENTER, width, 15, Color("#eadab5"))
			draw_rect(Rect2(x, y, width, 10.0), Color("#161f20de"))
			draw_rect(Rect2(x + 2.0, y + 2.0, (width - 4.0) * clampf(float(enemy["hp"]) / float(enemy["maxHp"]), 0.0, 1.0), 6.0), Color("#a8463b"))
			if enemy["surrendered"]:
				draw_string(ThemeDB.fallback_font, Vector2(x, y + 28.0), "СДАЁТСЯ · E ПОЩАДИТЬ", HORIZONTAL_ALIGNMENT_CENTER, width, 13, Color("#d9c27e"))
	for projectile in projectiles:
		var acid_frame := int(float(projectile.get("age", 0.0)) * 12.0) % 3
		var travel_angle := Vector2(float(projectile["vx"]), float(projectile["vy"])).angle()
		draw_acid_frame(acid_frame, Vector2(float(projectile["x"]), float(projectile["y"])), 64.0, travel_angle)
	for grenade in grenades:
		draw_circle(Vector2(grenade["x"], grenade["y"]), 6.5, Color("#3b4a31"))
		draw_circle(Vector2(grenade["x"] - 1.5, grenade["y"] - 2.0), 2.0, Color("#a2ad79"))
	for pool in acid_pools:
		var opacity := minf(0.82, float(pool["remaining"]) * 0.24)
		var pool_frame := 8 + int(float(pool.get("age", 0.0)) * 3.0) % 4
		draw_acid_frame(pool_frame, Vector2(float(pool["x"]), actor_ground() - 3.0), float(pool["radius"]) * 2.1, 0.0, true, opacity, 0.38)
	for effect in effects:
		if effect.get("kind") == "explosion" and textures.has("brute_burst"):
			var art_burst: Texture2D = textures["brute_burst"]
			var frame := mini(7, int(float(effect["age"]) * 11.0))
			draw_texture_rect_region(art_burst, Rect2(float(effect["x"]) - 108, actor_ground() - 158, 216, 148), Rect2((frame % 4) * art_burst.get_width() / 4.0, (frame / 4) * art_burst.get_height() / 2.0, art_burst.get_width() / 4.0, art_burst.get_height() / 2.0))
		elif effect.get("kind") == "acid_splash":
			var splash_frame := 4 + mini(3, int(float(effect["age"]) * 9.5))
			draw_acid_frame(splash_frame, Vector2(float(effect["x"]), float(effect["y"])), 80.0, 0.0, false, clampf(float(effect["life"]) * 5.0, 0.0, 1.0))
		elif effect.get("kind") == "tracer":
			var tracer_tint := Color(effect.get("tint", "#e4c189"))
			tracer_tint.a = clampf(float(effect["life"]) * 7.0, 0.0, 0.8)
			draw_line(effect["start"], effect["end"], tracer_tint, 2.6 if effect.get("tint") == "#5edce9" else 1.4)
		elif not effect.has("kind"):
			var tint: Color = effect["color"]
			tint.a = minf(1.0, float(effect["life"]) * 2.0)
			draw_circle(Vector2(effect["x"], effect["y"]), 2.5, tint)
	if health <= 0:
		draw_actor("player", player_x, 0.0, facing, player_death_age)
	elif textures.has("hero_torso"):
		draw_player_rig()
	else:
		draw_actor("player", player_x, walk_distance / 34.0, facing, -1.0, not player_moving)
	if health > 0:
		draw_weapon_arm()
		if muzzle_timer > 0.0:
			var shoulder := player_shoulder()
			var aim := player_aim_vector()
			var muzzle_lengths := {"pistol": 50.0, "shotgun": 54.0, "smg": 55.0, "assault": 56.0, "rifle": 60.0, "railgun": 58.0}
			var length: float = muzzle_lengths.get(weapon_item().get("type", "pistol"), 50.0)
			var muzzle_color := Color(0.45, 0.87, 0.96, muzzle_timer * 10.0) if weapon_item().get("type", "") == "railgun" else Color(1, 0.77, 0.36, muzzle_timer * 10.0)
			draw_circle(shoulder + aim * length, 5.5, muzzle_color)
	draw_visibility_overlay()

func draw_visibility_overlay() -> void:
	var zone: String = layout.get("zone", "")
	if ["parking", "bunker", "technical"].has(zone):
		draw_rect(Rect2(0, 0, world_width, actor_ground() + 20.0), Color(0.008, 0.017, 0.025, 0.12 if flashlight_on else 0.23))
		if flashlight_on and battery > 0.0:
			var origin := player_shoulder()
			var direction := player_aim_vector()
			var cone := PackedVector2Array([origin, origin + direction.rotated(-0.3) * 450.0, origin + direction.rotated(0.3) * 450.0])
			draw_colored_polygon(cone, Color("#ebd5a02b"))
			draw_circle(origin, 55.0, Color("#e2c9971b"))
	if infection >= 60.0:
		draw_rect(Rect2(0, 0, world_width, actor_ground() + 20.0), Color(0.20, 0.31, 0.12, 0.05 if infection < 90.0 else 0.13))

func draw_room_lighting() -> void:
	if layout.get("zone") == "roof":
		return
	var top := GROUND - float(layout["ground"]) * scale_factor
	for index in layout.get("lights", []).size():
		var fixture: Dictionary = layout["lights"][index]
		var rect: Array = fixture["rect"]
		var origin := Vector2((float(rect[0]) + float(rect[2]) * 0.5) * scale_factor, top + (float(rect[1]) + float(rect[3])) * scale_factor)
		var reach := clampf(GROUND - origin.y, 75.0, 310.0)
		var flicker := 0.88 + 0.12 * sin(scene_time * (2.2 + index * 0.4) + index * 5.0)
		for band in 3:
			var spread := 58.0 + band * 46.0
			var glow := PackedVector2Array([origin, Vector2(origin.x - spread, GROUND - 2.0), Vector2(origin.x + spread, GROUND - 2.0)])
			draw_colored_polygon(glow, Color(0.72, 0.78, 0.69, (0.045 - band * 0.009) * flicker))
		draw_circle(origin, 8.0, Color(0.8, 0.88, 0.82, 0.16 * flicker))
		draw_ground_ellipse(origin.x, GROUND - 3.0, minf(175.0, reach * 0.64), 15.0, Color(0.73, 0.76, 0.64, 0.065 * flicker))

func draw_distant_windows() -> void:
	if room_id != "" or not textures.has("city_panorama") or layout.get("windows", []).is_empty():
		return
	var panorama: Texture2D = textures["city_panorama"]
	var panorama_width := maxf(1900.0 * scale_factor, world_width)
	var panorama_height := panorama_width * panorama.get_height() / panorama.get_width()
	var panorama_top := GROUND - 423.0 - 95.0 * scale_factor
	var art_top := GROUND - float(layout["ground"]) * scale_factor
	for pane in layout["windows"]:
		var inset := 2.0 * scale_factor
		var dest := Rect2(float(pane[0]) * scale_factor + inset, art_top + float(pane[1]) * scale_factor + inset, maxf(1.0, float(pane[2]) * scale_factor - inset * 2.0), maxf(1.0, float(pane[3]) * scale_factor - inset * 2.0))
		var source := Rect2(dest.position.x / panorama_width * panorama.get_width(), (dest.position.y - panorama_top) / panorama_height * panorama.get_height(), dest.size.x / panorama_width * panorama.get_width(), dest.size.y / panorama_height * panorama.get_height())
		source.position.x = clampf(source.position.x, 0.0, panorama.get_width() - source.size.x)
		source.position.y = clampf(source.position.y, 0.0, panorama.get_height() - source.size.y)
		draw_texture_rect_region(panorama, dest, source, Color(0.72, 0.76, 0.76, 0.68))
		draw_rect(Rect2(dest.position.x, dest.position.y, 3.0, dest.size.y), Color("#0710159a"))
		draw_rect(Rect2(dest.position.x, dest.end.y - 4.0, dest.size.x, 4.0), Color("#0710159a"))

func draw_ground_ellipse(x: float, y: float, radius_x: float, radius_y: float, tint: Color) -> void:
	draw_set_transform(Vector2(x, y), 0.0, Vector2(radius_x, radius_y))
	draw_circle(Vector2.ZERO, 1.0, tint)
	draw_set_transform_matrix(Transform2D.IDENTITY)

func draw_acid_frame(index: int, at: Vector2, width: float, rotation := 0.0, bottom_aligned := false, opacity := 1.0, vertical_scale := 1.0) -> void:
	var atlas: Texture2D = textures.get("acid")
	if atlas == null or index < 0 or index >= acid_cells.size():
		return
	var cell: Array = acid_cells[index]
	var source := Rect2(float(cell[0]), float(cell[1]), float(cell[2]), float(cell[3]))
	var height := width * source.size.y / source.size.x * vertical_scale
	draw_set_transform(at, rotation, Vector2.ONE)
	draw_texture_rect_region(atlas, Rect2(-width * 0.5, -height if bottom_aligned else -height * 0.5, width, height), source, Color(1.0, 1.0, 1.0, opacity))
	draw_set_transform_matrix(Transform2D.IDENTITY)

func draw_foreground_props(layer_name: String) -> void:
	var placements: Array = foreground_layouts.get(layout.get("id", ""), [])
	for prop in placements:
		if prop["layer"] != layer_name:
			continue
		var zone: String = prop["zone"]
		var atlas: Texture2D = textures.get("foreground_%s" % zone)
		var cells: Array = foreground_cells.get(zone, [])
		var index := int(prop["index"])
		if atlas == null or index < 0 or index >= cells.size():
			continue
		var source: Array = cells[index]
		var cell_width := float(atlas.get_width()) / 5.0
		var depth := float(prop["depth"])
		var perspective := 0.9 + ((depth + 20.0) / 58.0) * 0.16
		var width := float(source[2]) / cell_width * float(prop["width"]) * perspective
		var height := float(source[3]) / cell_width * float(prop["width"]) * perspective
		var x := float(prop["x"])
		var foot_y := GROUND + maxf(0.0, depth)
		var near_hero := absf(x - player_x) < 85.0
		var alpha := (0.43 if near_hero else 0.82) if layer_name == "back" else (0.55 if near_hero else 0.91)
		draw_ground_ellipse(x, foot_y, maxf(7.0, width * 0.34), 3.0, Color("#03080b5e"))
		draw_texture_rect_region(atlas, Rect2(x - width * 0.5, foot_y - height, width, height), Rect2(float(source[0]), float(source[1]), float(source[2]), float(source[3])), Color(0.81, 0.79, 0.75, alpha))

func draw_apocalypse_props(layer_name: String) -> void:
	var placements: Array = apocalypse_layouts.get(layout.get("id", ""), [])
	for prop in placements:
		if str(prop["layer"]) != layer_name:
			continue
		var key := "%s_%s" % [prop["zone"], prop["sheet"]]
		var atlas: Texture2D = textures.get("apocalypse_%s" % key)
		var cells: Array = apocalypse_cells.get(key, [])
		var index := int(prop["index"])
		if atlas == null or index < 0 or index >= cells.size():
			continue
		var source: Array = cells[index]
		var width := float(prop["width"])
		var height := width * float(source[3]) / float(source[2])
		var x := float(prop["x"])
		var foot_y := GROUND + float(prop["depth"])
		draw_ground_ellipse(x, foot_y - 1.0, width * 0.40, 4.0, Color("#03080b8c"))
		var fade := 0.82 if absf(x - player_x) < 53.0 else 0.98
		draw_texture_rect_region(atlas, Rect2(x - width * 0.5, foot_y - height, width, height), Rect2(float(source[0]), float(source[1]), float(source[2]), float(source[3])), Color(0.96, 0.96, 0.93, fade))

func draw_floor_damage() -> void:
	# Floor-specific stains, impact cracks and loose debris break up the repeated
	# architectural band without covering the walking surface or door thresholds.
	var seed := absi(hash(str(layout.get("id", ""))))
	var zone := str(layout.get("zone", "office"))
	var stain := Color("#52372a88")
	if zone == "laboratory" or zone == "infirmary":
		stain = Color("#61713b83")
	elif zone == "parking" or zone == "technical" or zone == "bunker":
		stain = Color("#27313aaf")
	for step in range(20, int(world_width) - 20, 172):
		var n := absi(hash("%s:%d" % [layout.get("id", ""), step]))
		var x := float(step + n % 109)
		var y := GROUND + 19.0 + float((n >> 5) % 43)
		var radius := 8.0 + float((n >> 9) % 21)
		draw_ground_ellipse(x, y, radius, 2.0 + float((n >> 13) % 4), stain)
		for shard in 3:
			var angle := float((n >> (shard * 5)) % 17) * 0.24
			var reach := 7.0 + float((n >> (shard * 3 + 4)) % 12)
			draw_line(Vector2(x, y), Vector2(x + cos(angle) * reach, y + sin(angle) * reach * 0.24), Color("#080f11a6"), 1.0)

func hero_frame_name() -> String:
	if player_move_blend < 0.25:
		return "hero_torso"
	var phase := fposmod(walk_distance / HERO_STRIDE, 1.0)
	return HERO_WALK_FRAMES[mini(3, int(floorf(phase * 4.0)))]

func player_shoulder() -> Vector2:
	# Every authored full-body frame shares this fixed shoulder anchor.
	return Vector2(player_x + facing * ((530.0 - 550.0) * HERO_MASTER_SCALE), actor_ground() + (470.0 - 1380.0) * HERO_MASTER_SCALE)

func draw_player_rig() -> void:
	var frame_name := hero_frame_name()
	var body: Texture2D = textures.get(frame_name, textures["hero_torso"])
	var base := Transform2D(Vector2(float(facing), 0.0), Vector2(0.0, 1.0), Vector2(player_x, actor_ground()))
	# One uninterrupted figure contains both legs and both boots. The supporting
	# arm lies behind the vest; the trigger arm is drawn over the plain shoulder.
	if textures.has("hero_support_arm") and weapon_item().get("type", "") in ["shotgun", "smg", "assault", "rifle", "railgun"]:
		var arm: Texture2D = textures["hero_support_arm"]
		var shoulder := player_shoulder() + Vector2(-2.0 * facing, 0.0)
		var arm_base := Transform2D(Vector2(float(facing), 0.0), Vector2(0.0, 1.0), shoulder)
		var arm_scale := Vector2(0.043, 0.034)
		draw_set_transform_matrix(arm_base * Transform2D(player_aim_angle() - 0.15, Vector2.ZERO))
		draw_texture_rect(arm, Rect2(-200.0 * arm_scale.x, -360.0 * arm_scale.y, arm.get_width() * arm_scale.x, arm.get_height() * arm_scale.y), false)
	draw_set_transform_matrix(base)
	var baseline := float(HERO_FOOT_BASELINES.get(frame_name, 1380.0))
	var vertical_scale := HERO_MASTER_SCALE * (0.965 if frame_name == "hero_walk_passing_b" else 1.0)
	draw_texture_rect(body, Rect2(-550.0 * HERO_MASTER_SCALE, -baseline * vertical_scale, body.get_width() * HERO_MASTER_SCALE, body.get_height() * vertical_scale), false)
	draw_set_transform_matrix(Transform2D.IDENTITY)

func draw_atmosphere() -> void:
	var top := GROUND - float(layout["ground"]) * scale_factor
	for pane_index in layout.get("windows", []).size():
		var pane: Array = layout["windows"][pane_index]
		var left := float(pane[0]) * scale_factor
		var upper := top + float(pane[1]) * scale_factor
		var width := float(pane[2]) * scale_factor
		var height := float(pane[3]) * scale_factor
		for streak in 12:
			var seed := float(pane_index * 97 + streak * 31 + floor_number * 13)
			var x := left + 4.0 + fposmod(seed * 0.618 - scene_time * 22.0, maxf(1.0, width - 8.0))
			var y := upper + 5.0 + fposmod(seed * 1.41 + scene_time * (95.0 + streak * 3.0), maxf(1.0, height - 22.0))
			draw_line(Vector2(x, y), Vector2(maxf(left + 2.0, x - 3.0), minf(upper + height - 3.0, y + 12.0)), Color("#b3cbd34d"), 1.0)
		if fposmod(scene_time + pane_index * 0.19 + floor_number * 0.13, 19.0) < 0.12:
			draw_rect(Rect2(left + 2.0, upper + 2.0, width - 4.0, height - 4.0), Color("#b8d1e021"))
	for index in layout.get("drips", []).size():
		var drip: Array = layout["drips"][index]
		var x := float(drip[0]) * scale_factor
		var start_y := top + float(drip[1]) * scale_factor
		var distance := maxf(8.0, GROUND - start_y)
		var y := start_y + fposmod(scene_time * (57.0 + index * 7.0) + index * 63.0, distance)
		var tint := Color("#9ab8539e") if drip[2] == "slime" else Color("#a7c2c79e")
		draw_line(Vector2(x, y), Vector2(x, minf(GROUND - 3.0, y + 7.0)), tint, 2.0)
	for index in layout.get("lights", []).size():
		var fixture: Dictionary = layout["lights"][index]
		var rect: Array = fixture["rect"]
		var flicker := 0.35 + 0.25 * sin(scene_time * (3.0 + index) + floor_number + index * 4.0)
		var tint := Color(fixture.get("color", "#a9b6ba"))
		tint.a = flicker * 0.25
		draw_rect(Rect2(float(rect[0]) * scale_factor, top + float(rect[1]) * scale_factor, maxf(2.0, float(rect[2]) * scale_factor), maxf(2.0, float(rect[3]) * scale_factor)), tint)
	if layout.get("zone") == "roof":
		for index in 40:
			var x := fposmod(index * 113.0 - scene_time * 28.0, world_width)
			var y := fposmod(index * 71.0 + scene_time * 140.0, 550.0)
			draw_line(Vector2(x, y), Vector2(x - 5.0, y + 15.0), Color("#b2c8d344"), 1.0)

func attack_frame(remaining: float, duration: float, frame_count: int) -> int:
	return mini(frame_count - 1, maxi(0, int((1.0 - clampf(remaining / maxf(duration, 0.001), 0.0, 1.0)) * frame_count)))

func draw_actor(kind: String, x: float, phase: float, direction: int, death_age: float, idle := false, attack_time := 0.0, attack_kind := "", surrendered := false, attack_duration := 1.2, tint := Color.WHITE) -> void:
	var dead := death_age >= 0.0
	var visual_kind := "elena" if kind == "elena_echo" else kind
	var source_kind := "death" if dead else "walk"
	if surrendered and textures.has("surrender_%s" % visual_kind):
		source_kind = "surrender"
	if not dead and attack_time > 0.0:
		var action_sheet := "melee"
		if attack_kind == "spit":
			action_sheet = "spit"
		elif attack_kind == "scream":
			action_sheet = "scream"
		elif attack_kind == "volley":
			action_sheet = "volley"
		if textures.has("%s_%s" % [action_sheet, visual_kind]):
			source_kind = action_sheet
	if not textures.has("%s_%s" % [source_kind, visual_kind]):
		source_kind = "motion"
	var tex: Texture2D = textures.get("%s_%s" % [source_kind, visual_kind])
	if tex == null:
		return
	var death_key := "death_%s" % visual_kind
	if source_kind == "death" and sprite_death_layouts.has(death_key):
		var death_frame := mini(7, int(death_age * (8.0 if visual_kind == "player" else 9.0)))
		var death_layout: Dictionary = sprite_death_layouts[death_key]
		var split := float(death_layout["split"])
		var row_top := 0.0 if death_frame < 4 else split
		var source_height := split if death_frame < 4 else float(tex.get_height()) - split
		var ground_anchor := float(death_layout["bottoms"][death_frame])
		var source := Rect2(float(death_frame % 4) * tex.get_width() / 4.0, row_top, tex.get_width() / 4.0, source_height)
		var death_scale := 0.28 if visual_kind == "player" else (0.34 if BOSS_HEALTH.has(visual_kind) else INFECTED_SPRITE_SCALE)
		var size := source.size * death_scale
		draw_set_transform(Vector2(x, 0.0), 0.0, Vector2(direction, 1.0))
		draw_texture_rect_region(tex, Rect2(-size.x * 0.5, actor_ground() - ground_anchor * death_scale, size.x, size.y), source, tint)
		draw_set_transform_matrix(Transform2D.IDENTITY)
		return
	var cell_width := tex.get_width() / 4.0
	var cell_height := tex.get_height() / (3.0 if source_kind == "motion" else 2.0)
	var frame := int(floorf(phase)) % (4 if source_kind == "motion" else 8)
	if dead:
		frame = (8 + mini(3, int(death_age * 5.0))) if source_kind == "motion" else mini(7, int(death_age * 9.0))
	elif idle and kind == "player":
		frame = 1
	elif surrendered:
		frame = 7
	elif attack_time > 0.0 and ["melee", "spit", "scream", "volley"].has(source_kind):
		frame = attack_frame(attack_time, attack_duration, 8)
	elif attack_time > 0.0 and source_kind == "motion":
		frame = 4 + attack_frame(attack_time, attack_duration, 4)
	var factor := 0.28 if kind == "player" else ((0.5 if source_kind == "motion" else 0.34) if BOSS_HEALTH.has(visual_kind) else INFECTED_SPRITE_SCALE)
	var size := Vector2(cell_width, cell_height) * factor
	var anchor_key := "%s_%s" % [source_kind, visual_kind]
	var bottoms: Array = sprite_anchors.get(anchor_key, [])
	var visible_bottom := float(bottoms[frame]) if frame < bottoms.size() else cell_height * 0.94
	var y := actor_ground() - visible_bottom * factor
	draw_set_transform(Vector2(x, 0), 0.0, Vector2(direction, 1))
	draw_texture_rect_region(tex, Rect2(-size.x * 0.5, y, size.x, size.y), Rect2(float(frame % 4) * cell_width, float(frame / 4) * cell_height, cell_width, cell_height), tint)
	draw_set_transform_matrix(Transform2D.IDENTITY)

func update_aim(target: Vector2, delta: float) -> void:
	var aim_deadband := maxf(28.0, absf(target.y - (actor_ground() - 82.0)) * 0.3)
	if target.x > player_x + aim_deadband:
		facing = 1
	elif target.x < player_x - aim_deadband:
		facing = -1
	var shoulder := player_shoulder()
	var toward := target - shoulder
	var forward := maxf(28.0, toward.x * facing)
	var desired := clampf(atan2(toward.y, forward), -1.43, 1.43)
	aim_angle = lerpf(aim_angle, desired, 1.0 - exp(-maxf(0.0, delta) * 18.0))

func player_aim_angle() -> float:
	return aim_angle

func player_aim_vector() -> Vector2:
	return Vector2(float(facing) * cos(aim_angle), sin(aim_angle))

func draw_weapon_arm() -> void:
	# The clean torso has no fixed sleeve; use one complete animated arm from
	# shoulder to hand. Long guns have a second support hand on their fore-end.
	var shoulder := player_shoulder()
	var weapon := weapon_item()
	var unarmed := weapon.is_empty()
	var angle := 1.13 if unarmed else player_aim_angle()
	var arsenal_positions := {"smg": Vector2(0.0, 0.0), "assault": Vector2(768.0, 0.0), "rifle": Vector2(0.0, 512.0), "railgun": Vector2(768.0, 512.0)}
	var advanced := arsenal_positions.has(weapon.get("type", ""))
	var tex: Texture2D = textures["weapon_arsenal"] if advanced else textures["weapon_arms"]
	var base := Transform2D(Vector2(float(facing), 0.0), Vector2(0.0, 1.0), shoulder)
	draw_set_transform_matrix(base * Transform2D(angle, Vector2.ZERO))
	var source_x := float(arsenal_positions[weapon["type"]].x) if advanced else (768.0 if weapon.get("type", "") == "shotgun" else 0.0)
	var source_y := float(arsenal_positions[weapon["type"]].y) if advanced else (512.0 if unarmed else 0.0)
	var source_width := 550.0 if unarmed else 768.0
	draw_texture_rect_region(tex, Rect2(-130.0 * HERO_ARM_SCALE, -250.0 * HERO_ARM_SCALE, source_width * HERO_ARM_SCALE, 512.0 * HERO_ARM_SCALE), Rect2(source_x, source_y, source_width, 512.0))
	draw_set_transform_matrix(Transform2D.IDENTITY)
