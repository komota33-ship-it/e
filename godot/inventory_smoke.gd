extends SceneTree

func _initialize() -> void:
	call_deferred("run_checks")

func check(ok: bool, message: String) -> bool:
	if not ok:
		printerr("FAIL: %s" % message)
		quit(1)
		return false
	return true

func run_checks() -> void:
	var file := FileAccess.open("res://godot/catalog.json", FileAccess.READ)
	var catalog: Dictionary = JSON.parse_string(file.get_as_text())
	var bag := LiftInventory.new(catalog)
	for item in catalog["starterInventory"]:
		if not check(bag.add_item(item["type"], int(item["qty"]), item) == 0, "starter item %s" % item["type"]):
			return
	if not check(bag.items.size() == 6 and bag.total("ammo") == 36, "starter inventory and ammo"):
		return
	var pistol := bag.items[0]
	if not check(bag.find_item(pistol["uid"]).get("loaded", -1) == 12, "loaded rounds preserved"):
		return
	if not check(not bag.can_place(pistol, 99, 99, false), "grid bounds"):
		return
	if not check(bag.consume("ammo", 12) and bag.total("ammo") == 24, "consume rounds"):
		return
	if not check(bag.add_item("green") == 0 and bag.add_item("red") == 0, "herbs fit"):
		return
	var herb: Dictionary = {}
	for item in bag.items:
		if item["type"] == "green":
			herb = item
	if not check(bag.combine(herb["uid"]) and bag.total("mixture") == 1, "herbs combine atomically"):
		return
	if not check(bag.equipped_weight() > 0 and bag.weight_limit() == 18, "backpack weight"):
		return
	var restored := LiftInventory.new(catalog)
	restored.restore(bag.serialize())
	if not check(restored.items == bag.items, "inventory save round trip"):
		return
	var attachment_bag := LiftInventory.new(catalog)
	attachment_bag.add_item("pistol", 1, {"loaded": 12})
	var weapon_uid: String = attachment_bag.items[0]["uid"]
	attachment_bag.add_item("extendedmag")
	var attachment_uid: String = attachment_bag.items[1]["uid"]
	if not check(attachment_bag.install_attachment(attachment_uid, weapon_uid) and attachment_bag.weapon_capacity(attachment_bag.find_item(weapon_uid)) == 18, "extended magazine installation"):
		return
	attachment_bag.find_item(weapon_uid)["loaded"] = 18
	if not check(attachment_bag.remove_attachment(weapon_uid, "magazine") and attachment_bag.find_item(weapon_uid)["loaded"] == 12 and attachment_bag.total("ammo") == 6, "detaching magazine returns excess rounds"):
		return
	attachment_bag.add_item("suppressor")
	for item in attachment_bag.items:
		if item["type"] == "suppressor":
			attachment_uid = item["uid"]
	if not check(attachment_bag.install_attachment(attachment_uid, weapon_uid) and attachment_bag.find_item(weapon_uid)["attachments"]["muzzle"] == "suppressor", "suppressor occupies muzzle slot"):
		return
	var repair_bag := LiftInventory.new(catalog)
	repair_bag.add_item("armor", 1, {"durability": 24})
	var armor_uid: String = repair_bag.items[0]["uid"]
	repair_bag.add_item("metal")
	repair_bag.add_item("cloth")
	if not check(repair_bag.repair_armor(armor_uid) and repair_bag.find_item(armor_uid)["durability"] == 100.0 and repair_bag.total("metal") == 0, "armor repair consumes parts and restores durability"):
		return
	var progress := LiftProgression.new(catalog)
	progress.test_mode = true
	progress.profile["dna"] = 1000
	if not check(progress.buy("damage") and progress.rank("damage") == 1, "perk purchase"):
		return
	if not check(progress.award("walker") == 5 and progress.effects()["gunDamage"] > 1.0, "DNA and perk effect"):
		return
	print("PASS: Godot inventory grid, stacking, combining, weight, save and progression")
	quit(0)
