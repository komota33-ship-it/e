class_name LiftBase
extends RefCounted

const LEVEL_COSTS := {2: 500, 3: 1000, 4: 2000, 5: 3500, 6: 5000, 7: 7500, 8: 10000, 9: 15000, 10: 25000}
const ROOM_ORDER := ["workbench", "medical", "storage", "radio", "turret", "generator", "farm", "armory", "laboratory", "command"]
const ROOM_NAMES := {"workbench": "ВЕРСТАК", "medical": "МЕДСТОЛ", "storage": "СКЛАД", "radio": "РАДИО", "turret": "ТУРЕЛЬ", "generator": "ГЕНЕРАТОР", "farm": "ФЕРМА", "armory": "ОРУЖЕЙНАЯ", "laboratory": "ЛАБОРАТОРИЯ", "command": "КОМАНДНЫЙ ЦЕНТР"}
const ROOM_UNLOCK := {"workbench": 1, "medical": 2, "storage": 3, "radio": 4, "turret": 5, "generator": 6, "farm": 7, "armory": 8, "laboratory": 9, "command": 10}
const ROOM_COSTS := [100, 250, 600, 1200, 2500]
const NPC_NAMES := {"medic": "МЕДИК", "engineer": "ИНЖЕНЕР", "guard": "ОХРАННИК", "trader": "ТОРГОВЕЦ", "cook": "ПОВАР", "dog": "СОБАКА", "child": "РЕБЁНОК"}
const FARM_RATES := [0.0, 5.0, 10.0, 15.0, 25.0, 40.0]
const STORAGE_SLOTS := [20, 30, 40, 50, 60, 80]
const PRESETS := {
	"assault": {"name": "ШТУРМОВОЙ", "items": {"ammo": 24, "medkit": 1, "grenade": 1}},
	"quiet": {"name": "ТИХИЙ", "items": {"ammo": 12, "bandage": 2, "battery": 2}},
	"heavy": {"name": "ТЯЖЁЛЫЙ", "items": {"shells": 8, "medkit": 1, "grenade": 2}}
}
const STARTER_STASH := {"ammo": 24, "medkit": 1, "grenade": 1, "bandage": 2, "battery": 2, "food": 2}

var progression: LiftProgression

func _init(owner: LiftProgression) -> void:
	progression = owner
	if not progression.profile.has("base") or not progression.profile["base"] is Dictionary:
		progression.profile["base"] = {}
	var base := state()
	base["level"] = clampi(int(base.get("level", 1)), 1, 10)
	var rooms: Dictionary = base.get("rooms", {})
	for id in ROOM_ORDER:
		rooms[id] = clampi(int(rooms.get(id, 0)), 0, 5)
	base["rooms"] = rooms
	var resources: Dictionary = base.get("resources", {})
	for id in ["food", "water", "fuel"]:
		resources[id] = maxf(0.0, float(resources.get(id, 0.0)))
	base["resources"] = resources
	base["npcs"] = base.get("npcs", []) if base.get("npcs", []) is Array else []
	base["stash"] = base.get("stash", {}) if base.get("stash", {}) is Dictionary else {}
	base["prepared"] = base.get("prepared", {}) if base.get("prepared", {}) is Dictionary else {}
	if not bool(base.get("starterGrant", false)):
		for id in STARTER_STASH:
			base["stash"][id] = int(base["stash"].get(id, 0)) + int(STARTER_STASH[id])
		base["starterGrant"] = true
	base["lastTick"] = float(base.get("lastTick", 0.0))
	base["lastWave"] = float(base.get("lastWave", 0.0))
	base["waves"] = maxi(0, int(base.get("waves", 0)))
	base["waveLog"] = base.get("waveLog", []) if base.get("waveLog", []) is Array else []
	base["dnaFraction"] = clampf(float(base.get("dnaFraction", 0.0)), 0.0, 0.9999)
	progression.profile["morale"] = clampi(int(progression.profile.get("morale", 50)), 0, 100)

func state() -> Dictionary:
	return progression.profile["base"]

func persist() -> void:
	progression.save_profile()

func room_level(id: String) -> int:
	return int(state()["rooms"].get(id, 0))

func has_npc(id: String) -> bool:
	return state()["npcs"].has(id)

func level_cost() -> int:
	return int(LEVEL_COSTS.get(int(state()["level"]) + 1, 0))

func upgrade_level() -> bool:
	var cost := level_cost()
	if cost <= 0 or not progression.spend(cost):
		return false
	state()["level"] = int(state()["level"]) + 1
	persist()
	return true

func room_cost(id: String) -> int:
	if not ROOM_ORDER.has(id) or int(state()["level"]) < int(ROOM_UNLOCK[id]) or room_level(id) >= 5:
		return 0
	return int(ROOM_COSTS[room_level(id)])

func upgrade_room(id: String) -> bool:
	var cost := room_cost(id)
	if cost <= 0 or not progression.spend(cost):
		return false
	state()["rooms"][id] = room_level(id) + 1
	persist()
	return true

func change_morale(amount: int) -> int:
	progression.profile["morale"] = clampi(int(progression.profile["morale"]) + amount, 0, 100)
	persist()
	return int(progression.profile["morale"])

func recruit(id: String) -> bool:
	if not NPC_NAMES.has(id) or has_npc(id):
		return false
	state()["npcs"].append(id)
	persist()
	return true

func heal_multiplier() -> float:
	return 1.0 + 0.1 * float(room_level("medical"))

func craft_multiplier() -> float:
	return maxf(0.2, 1.0 - 0.1 * float(room_level("workbench")) - (0.2 if has_npc("engineer") else 0.0))

func dna_multiplier() -> float:
	return 1.1 if has_npc("trader") else 1.0

func rare_bonus() -> int:
	return (10 if has_npc("dog") else 0) + (10 if has_npc("child") else 0)

func storage_capacity() -> int:
	return int(STORAGE_SLOTS[room_level("storage")])

func stash_slots(catalog: Dictionary) -> int:
	var used := 0
	var all_ids: Dictionary = {}
	for id in state()["stash"]:
		all_ids[id] = true
	for id in state()["prepared"]:
		all_ids[id] = true
	for id in all_ids:
		var stack := maxi(1, int(catalog["items"].get(id, {}).get("stack", 1)))
		used += ceili(float(int(state()["stash"].get(id, 0)) + int(state()["prepared"].get(id, 0))) / float(stack))
	return used

func store_supply(id: String, quantity: int, catalog: Dictionary) -> int:
	var item: Dictionary = catalog["items"].get(id, {})
	if item.is_empty() or str(item.get("group", "")) in ["weapon", "armor", "backpack", "attachment"] or quantity <= 0:
		return 0
	var accepted := 0
	var stash: Dictionary = state()["stash"]
	for count in quantity:
		var old_quantity := int(stash.get(id, 0))
		stash[id] = old_quantity + 1
		if stash_slots(catalog) > storage_capacity():
			if old_quantity == 0:
				stash.erase(id)
			else:
				stash[id] = old_quantity
			break
		accepted += 1
	if accepted > 0:
		persist()
	return accepted

func prepare_supply(id: String, quantity: int) -> bool:
	var stash: Dictionary = state()["stash"]
	var prepared: Dictionary = state()["prepared"]
	if quantity <= 0 or int(stash.get(id, 0)) < quantity or prepared.size() >= 4 and not prepared.has(id):
		return false
	stash[id] = int(stash[id]) - quantity
	if int(stash[id]) == 0:
		stash.erase(id)
	prepared[id] = int(prepared.get(id, 0)) + quantity
	persist()
	return true

func return_prepared(id: String) -> bool:
	var prepared: Dictionary = state()["prepared"]
	if not prepared.has(id):
		return false
	var stash: Dictionary = state()["stash"]
	stash[id] = int(stash.get(id, 0)) + int(prepared[id])
	prepared.erase(id)
	persist()
	return true

func take_prepared() -> Dictionary:
	var result: Dictionary = state()["prepared"].duplicate(true)
	state()["prepared"].clear()
	persist()
	return result

func can_apply_preset(id: String) -> bool:
	if not PRESETS.has(id):
		return false
	var needed: Dictionary = PRESETS[id]["items"]
	for item_id in needed:
		var available := int(state()["stash"].get(item_id, 0)) + int(state()["prepared"].get(item_id, 0))
		if available < int(needed[item_id]):
			return false
	return true

func apply_preset(id: String) -> bool:
	if not can_apply_preset(id):
		return false
	var available: Dictionary = state()["stash"].duplicate(true)
	for item_id in state()["prepared"]:
		available[item_id] = int(available.get(item_id, 0)) + int(state()["prepared"][item_id])
	var desired: Dictionary = PRESETS[id]["items"].duplicate(true)
	for item_id in desired:
		available[item_id] = int(available[item_id]) - int(desired[item_id])
		if int(available[item_id]) == 0:
			available.erase(item_id)
	state()["stash"] = available
	state()["prepared"] = desired
	persist()
	return true

func wave_threat() -> int:
	return int(state()["level"]) * 100 + int(progression.profile["deaths"]) * 50

func wave_defense() -> int:
	return (room_level("turret") + (1 if has_npc("guard") else 0)) * 300 + room_level("command") * 150

func last_wave() -> Dictionary:
	var log: Array = state()["waveLog"]
	return log.back() if not log.is_empty() else {}

func collect_run_supplies(items: Array, catalog: Dictionary) -> int:
	var collected := 0
	for item in items:
		collected += store_supply(str(item.get("type", "")), int(item.get("qty", 0)), catalog)
	return collected

func sync_time(now: float) -> void:
	var base := state()
	if float(base["lastTick"]) <= 0.0:
		base["lastTick"] = now
		base["lastWave"] = now
		persist()
		return
	var elapsed := clampf(now - float(base["lastTick"]), 0.0, 86400.0)
	if elapsed <= 0.0:
		return
	var hours := elapsed / 3600.0
	var resources: Dictionary = base["resources"]
	var farm_rate := float(FARM_RATES[room_level("farm")]) * (1.5 if has_npc("cook") else 1.0)
	resources["food"] = maxf(0.0, float(resources["food"]) + (farm_rate - float(base["npcs"].size())) * hours)
	resources["water"] = maxf(0.0, float(resources["water"]) + (farm_rate - float(base["npcs"].size())) * hours)
	resources["fuel"] = maxf(0.0, float(resources["fuel"]) + (2.0 * room_level("generator") - room_level("turret")) * hours)
	if room_level("generator") > 0:
		var dna_gain := (float(room_level("generator")) * 10.0) * hours + float(base["dnaFraction"])
		progression.profile["dna"] = int(progression.profile["dna"]) + floori(dna_gain)
		base["dnaFraction"] = dna_gain - floorf(dna_gain)
	var wave_age := maxf(0.0, now - float(base["lastWave"]))
	var waves := mini(3, floori(wave_age / 28800.0))
	for wave in maxi(0, waves):
		var threat := wave_threat()
		var defense := wave_defense()
		var defended := defense >= threat and float(resources["fuel"]) >= 1.0
		if not defended:
			for id in resources:
				resources[id] = float(resources[id]) * 0.9
		else:
			resources["fuel"] = maxf(0.0, float(resources["fuel"]) - 1.0)
		base["waveLog"].append({"at": now - fposmod(wave_age, 28800.0) - (waves - wave - 1) * 28800.0, "defended": defended, "threat": threat, "defense": defense})
		while base["waveLog"].size() > 6:
			base["waveLog"].pop_front()
		base["waves"] = int(base["waves"]) + 1
	if waves > 0:
		base["lastWave"] = now - fposmod(wave_age, 28800.0)
	base["lastTick"] = now
	persist()
