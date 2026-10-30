class_name LiftInventory
extends RefCounted

var catalog: Dictionary
var items: Array[Dictionary] = []
var backpack := "pack_survivor"
var sequence := 1

func _init(data: Dictionary) -> void:
	catalog = data

func grid() -> Dictionary:
	return catalog["backpacks"].get(backpack, catalog["backpacks"]["pack_survivor"])

func definition(type: String) -> Dictionary:
	return catalog["items"].get(type, {})

func dimensions(item: Dictionary, rotated: bool) -> Vector2i:
	var info := definition(item["type"])
	return Vector2i(int(info.get("h", 1)), int(info.get("w", 1))) if rotated else Vector2i(int(info.get("w", 1)), int(info.get("h", 1)))

func can_place(item: Dictionary, x: int, y: int, rotated: bool, skip_uid := "") -> bool:
	var size := dimensions(item, rotated)
	var pack := grid()
	if x < 0 or y < 0 or x + size.x > int(pack["columns"]) or y + size.y > int(pack["rows"]):
		return false
	for other in items:
		if other["uid"] == skip_uid:
			continue
		var other_size := dimensions(other, bool(other.get("rotated", false)))
		if x < int(other["x"]) + other_size.x and x + size.x > int(other["x"]) and y < int(other["y"]) + other_size.y and y + size.y > int(other["y"]):
			return false
	return true

func find_item(uid: String) -> Dictionary:
	for item in items:
		if item["uid"] == uid:
			return item
	return {}

func item_at(x: int, y: int) -> Dictionary:
	for item in items:
		var size := dimensions(item, bool(item.get("rotated", false)))
		if x >= int(item["x"]) and x < int(item["x"]) + size.x and y >= int(item["y"]) and y < int(item["y"]) + size.y:
			return item
	return {}

func move_item(uid: String, x: int, y: int) -> bool:
	var item := find_item(uid)
	if item.is_empty() or not can_place(item, x, y, bool(item.get("rotated", false)), uid):
		return false
	item["x"] = x
	item["y"] = y
	return true

func rotate_item(uid: String) -> bool:
	var item := find_item(uid)
	if item.is_empty():
		return false
	var rotated := not bool(item.get("rotated", false))
	if not can_place(item, int(item["x"]), int(item["y"]), rotated, uid):
		return false
	item["rotated"] = rotated
	return true

func total(type: String) -> int:
	var result := 0
	for item in items:
		if item["type"] == type:
			result += int(item["qty"])
	return result

func add_item(type: String, quantity := 1, extra: Dictionary = {}) -> int:
	var info := definition(type)
	if info.is_empty() or quantity <= 0:
		return quantity
	var stack := int(info.get("stack", 1))
	for item in items:
		if item["type"] != type or int(item["qty"]) >= stack:
			continue
		var added := mini(stack - int(item["qty"]), quantity)
		item["qty"] = int(item["qty"]) + added
		quantity -= added
		if quantity <= 0:
			return 0
	while quantity > 0:
		var item := extra.duplicate(true)
		item.merge({"uid": "item-%d" % sequence, "type": type, "qty": mini(stack, quantity), "x": 0, "y": 0, "rotated": false}, true)
		sequence += 1
		var fitted := false
		for rotation in [false, true]:
			for y in int(grid()["rows"]):
				for x in int(grid()["columns"]):
					if can_place(item, x, y, rotation):
						item["x"] = x
						item["y"] = y
						item["rotated"] = rotation
						fitted = true
						break
				if fitted:
					break
			if fitted:
				break
		if not fitted:
			break
		if info.get("group") == "weapon" and not item.has("loaded"):
			item["loaded"] = 0
		if info.get("group") == "armor" and not item.has("durability"):
			item["durability"] = 100
		items.append(item)
		quantity -= int(item["qty"])
	return quantity

func consume(type: String, quantity := 1) -> bool:
	if quantity <= 0 or total(type) < quantity:
		return false
	for index in range(items.size() - 1, -1, -1):
		if quantity <= 0:
			break
		var item := items[index]
		if item["type"] != type:
			continue
		var used := mini(quantity, int(item["qty"]))
		item["qty"] = int(item["qty"]) - used
		quantity -= used
		if int(item["qty"]) == 0:
			items.remove_at(index)
	return true

func remove_item(uid: String) -> Dictionary:
	for index in items.size():
		if items[index]["uid"] == uid:
			var item := items[index]
			items.remove_at(index)
			return item
	return {}

func craft(recipe_id: String, dna: int) -> bool:
	var recipe: Dictionary = catalog["recipes"].get(recipe_id, {})
	if recipe.is_empty() or recipe.get("repair", false) or dna < int(recipe.get("dna", 0)):
		return false
	for type in recipe["ingredients"]:
		if total(type) < int(recipe["ingredients"][type]):
			return false
	var snapshot := items.duplicate(true)
	var old_sequence := sequence
	for type in recipe["ingredients"]:
		consume(type, int(recipe["ingredients"][type]))
	if add_item(recipe["out"], int(recipe.get("qty", 1))) > 0:
		items = snapshot
		sequence = old_sequence
		return false
	return true

func repair_armor(uid: String) -> bool:
	var item := find_item(uid)
	if item.is_empty() or definition(item["type"]).get("group", "") != "armor" or float(item.get("durability", 100)) >= 100.0:
		return false
	var requirements: Dictionary = catalog.get("recipes", {}).get("repair", {}).get("ingredients", {})
	for type in requirements:
		if total(type) < int(requirements[type]):
			return false
	for type in requirements:
		consume(type, int(requirements[type]))
	item["durability"] = 100.0
	return true

func combine(uid: String) -> bool:
	var item := find_item(uid)
	if item.is_empty():
		return false
	var combination: Array = {"green": ["red", "mixture", 1], "red": ["green", "mixture", 1], "powder": ["metal", "ammo", 15], "metal": ["powder", "ammo", 15]}.get(item["type"], [])
	if combination.is_empty() or total(combination[0]) < 1:
		return false
	var snapshot := items.duplicate(true)
	var old_sequence := sequence
	consume(item["type"])
	consume(combination[0])
	if add_item(combination[1], combination[2]) > 0:
		items = snapshot
		sequence = old_sequence
		return false
	return true

func weapon_capacity(weapon: Dictionary) -> int:
	var info := definition(weapon.get("type", ""))
	var capacity := int(info.get("capacity", 0))
	if weapon.get("attachments", {}).get("magazine", "") == "extendedmag":
		capacity = floori(capacity * 1.5)
	return capacity

func install_attachment(attachment_uid: String, weapon_uid: String) -> bool:
	var attachment := find_item(attachment_uid)
	var weapon := find_item(weapon_uid)
	var info: Dictionary = catalog.get("attachments", {}).get(attachment.get("type", ""), {})
	if attachment.is_empty() or weapon.is_empty() or info.is_empty() or definition(weapon["type"]).get("group") != "weapon":
		return false
	var slot: String = info["slot"]
	if weapon.get("attachments", {}).has(slot):
		return false
	var installed: Dictionary = weapon.get("attachments", {}).duplicate(true)
	installed[slot] = attachment["type"]
	weapon["attachments"] = installed
	remove_item(attachment_uid)
	return true

func remove_attachment(weapon_uid: String, slot: String) -> bool:
	var weapon := find_item(weapon_uid)
	if weapon.is_empty() or definition(weapon["type"]).get("group") != "weapon":
		return false
	var installed: Dictionary = weapon.get("attachments", {}).duplicate(true)
	var type: String = installed.get(slot, "")
	if not catalog.get("attachments", {}).has(type):
		return false
	var snapshot := serialize()
	installed.erase(slot)
	weapon["attachments"] = installed
	var overflow := maxi(0, int(weapon.get("loaded", 0)) - weapon_capacity(weapon))
	weapon["loaded"] = int(weapon.get("loaded", 0)) - overflow
	var ammo_type: String = definition(weapon["type"]).get("ammo", "")
	if (overflow > 0 and add_item(ammo_type, overflow) > 0) or add_item(type) > 0:
		restore(snapshot)
		return false
	return true

func equipped_weight() -> float:
	var result := 0.0
	for item in items:
		var info := definition(item["type"])
		result += float(info.get("weight", 0)) * int(item["qty"])
		if info.get("group") == "weapon":
			result += int(item.get("loaded", 0)) * float(definition(info.get("ammo", "")).get("weight", 0))
			for attached in item.get("attachments", {}).values():
				result += float(catalog.get("attachments", {}).get(attached, {}).get("weight", 0))
	return result

func weight_limit(extra := 0.0) -> float:
	return 10.0 + float(grid().get("bonus", 0)) + extra

func set_backpack(type: String) -> bool:
	if not catalog["backpacks"].has(type):
		return false
	var previous := backpack
	var previous_items := items.duplicate(true)
	backpack = type
	items.clear()
	var ordered: Array[Dictionary] = previous_items.duplicate(true)
	ordered.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var a_size := dimensions(a, false)
		var b_size := dimensions(b, false)
		return a_size.x * a_size.y > b_size.x * b_size.y)
	for item in ordered:
		var fitted := false
		for rotation in [false, true]:
			for y in int(grid()["rows"]):
				for x in int(grid()["columns"]):
					if can_place(item, x, y, rotation):
						item["x"] = x
						item["y"] = y
						item["rotated"] = rotation
						fitted = true
						break
				if fitted:
					break
			if fitted:
				break
		if not fitted:
			backpack = previous
			items = previous_items
			return false
		items.append(item)
	return true

func serialize() -> Dictionary:
	return {"items": items.duplicate(true), "backpack": backpack, "sequence": sequence}

func restore(data: Dictionary) -> void:
	backpack = data.get("backpack", "pack_survivor")
	if not catalog["backpacks"].has(backpack):
		backpack = "pack_survivor"
	items.clear()
	sequence = maxi(1, int(data.get("sequence", 1)))
	for raw in data.get("items", []):
		if not raw is Dictionary or definition(raw.get("type", "")).is_empty():
			continue
		if int(raw.get("qty", 0)) < 1:
			continue
		if can_place(raw, int(raw.get("x", -1)), int(raw.get("y", -1)), bool(raw.get("rotated", false))):
			items.append(raw.duplicate(true))
