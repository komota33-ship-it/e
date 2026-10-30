class_name LiftProgression
extends RefCounted

const PATH := "user://lift_progress.json"

var catalog: Dictionary
var profile: Dictionary = {}
var test_mode := false

func _init(data: Dictionary) -> void:
	catalog = data
	var ranks := {}
	for id in catalog["perks"]:
		ranks[id] = 0
	profile = {"version": 2, "dna": 0, "dnaRemainder": 0, "earned": 0, "kills": 0, "deaths": 0, "wins": 0, "bestDepth": 0, "morale": 50, "base": {}, "perks": ranks}

func load_profile() -> void:
	if not FileAccess.file_exists(PATH):
		return
	var file := FileAccess.open(PATH, FileAccess.READ)
	var stored: Variant = JSON.parse_string(file.get_as_text())
	if not stored is Dictionary:
		return
	for key in ["dna", "dnaRemainder", "earned", "kills", "deaths", "wins", "bestDepth"]:
		profile[key] = maxi(0, int(stored.get(key, 0)))
	for id in catalog["perks"]:
		profile["perks"][id] = clampi(int(stored.get("perks", {}).get(id, 0)), 0, 3)
	profile["morale"] = clampi(int(stored.get("morale", 50)), 0, 100)
	profile["base"] = stored.get("base", {}) if stored.get("base", {}) is Dictionary else {}

func save_profile() -> void:
	if test_mode:
		return
	var file := FileAccess.open(PATH, FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(profile))

func rank(id: String) -> int:
	return int(profile["perks"].get(id, 0))

func synergy(id: String) -> bool:
	var definition: Dictionary = catalog["synergies"].get(id, {})
	if definition.is_empty():
		return false
	for perk in definition["requires"]:
		if rank(perk) < int(definition["requires"][perk]):
			return false
	return true

func buy(id: String) -> bool:
	var perk: Dictionary = catalog["perks"].get(id, {})
	if perk.is_empty() or rank(id) >= 3:
		return false
	var cost := int(perk["costs"][rank(id)])
	if int(profile["dna"]) < cost:
		return false
	profile["dna"] = int(profile["dna"]) - cost
	profile["perks"][id] = rank(id) + 1
	save_profile()
	return true

func award(type: String) -> int:
	var base := int(catalog["dnaRewards"].get(type, 0))
	if base <= 0:
		return 0
	var hundredths := base * (100 + rank("morale") * 10) + int(profile["dnaRemainder"])
	var amount := hundredths / 100
	profile["dnaRemainder"] = hundredths % 100
	profile["dna"] = int(profile["dna"]) + amount
	profile["earned"] = int(profile["earned"]) + amount
	profile["kills"] = int(profile["kills"]) + 1
	save_profile()
	return amount

func spend(amount: int) -> bool:
	if amount < 0 or int(profile["dna"]) < amount:
		return false
	profile["dna"] = int(profile["dna"]) - amount
	save_profile()
	return true

func record_depth(floor_number: int) -> void:
	profile["bestDepth"] = maxi(int(profile["bestDepth"]), 50 if floor_number == 0 else 51 - floor_number)
	save_profile()

func effects() -> Dictionary:
	var survivor := rank("health") + rank("speed") + rank("regeneration") + rank("resilience") + rank("secondWind")
	return {
		"maxHp": 100 + 20 * rank("health") + (100 if synergy("tank") else 0),
		"carryCapacity": 18 + 2 * survivor + 5 * rank("loader") + (10 if synergy("hamster") else 0),
		"lootBonus": rank("looter") + (3 if synergy("hamster") else 0),
		"rareLootBonus": 10 * rank("luck") + (30 if synergy("collector") else 0),
		"inspection": rank("attentive"),
		"regeneration": rank("regeneration"),
		"incomingDamage": (1.0 - 0.1 * rank("resilience")) * (0.5 if synergy("tank") else 1.0),
		"revivals": rank("secondWind"),
		"revivalHealth": 0.5 if synergy("phoenix") else 0.25,
		"gunDamage": 1.0 + 0.1 * rank("damage"),
		"fireRate": 1.0 + 0.15 * rank("rapid"),
		"penetration": rank("piercing") + (1 if synergy("assault") else 0),
		"criticalChance": 0.1 * rank("critical"),
		"headshotDamage": 1.5 if synergy("sniper") else 1.0,
		"berserk": synergy("berserk"),
		"meleeDamage": [1.0, 1.25, 1.5, 2.0][rank("melee")] * (2.0 if synergy("butcher") else 1.0),
		"searchTime": 1.0 - 0.2 * rank("search"),
		"infectionResistance": 0.2 * rank("immunity"),
		"searchNoise": 1.0 - 0.3 * rank("silent"),
		"craftTime": 1.0 - 0.2 * rank("engineer"),
		"trapFactor": [1.0, 0.5, 0.25, 0.0][rank("sapper")],
		"shockResistance": [0.0, 0.5, 0.75, 1.0][rank("electrician")],
		"gasResistance": [0.0, 0.5, 0.75, 1.0][rank("respirator")],
		"moveSpeed": 1.0 + 0.1 * rank("speed"),
		"enemySpeed": 1.0 - 0.1 * rank("connection"),
		"noiseFactor": 0.5 if synergy("ghost") else 1.0,
	}
