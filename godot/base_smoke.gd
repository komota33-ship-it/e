extends SceneTree

func _initialize() -> void:
	call_deferred("run_checks")

func require(ok: bool, reason: String) -> bool:
	if not ok:
		printerr("FAIL: %s" % reason)
		quit(1)
		return false
	return true

func run_checks() -> void:
	var catalog: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://godot/catalog.json"))
	var progress := LiftProgression.new(catalog)
	progress.test_mode = true
	var base := LiftBase.new(progress)
	if not require(base.state()["level"] == 1 and base.storage_capacity() == 20 and int(progress.profile["morale"]) == 50, "old profiles receive a level-one base, storage and neutral morale"):
		return
	if not require(int(base.state()["stash"].get("ammo", 0)) == 24 and int(base.state()["stash"].get("medkit", 0)) == 1, "new bases receive one small supply grant"):
		return
	LiftBase.new(progress)
	if not require(int(base.state()["stash"]["ammo"]) == 24, "migration never grants starter supplies twice"):
		return
	if not require(base.apply_preset("assault") and int(base.state()["prepared"]["ammo"]) == 24 and base.state()["prepared"].size() == 3, "assault preset prepares a complete loadout atomically"):
		return
	if not require(base.apply_preset("quiet") and int(base.state()["prepared"]["bandage"]) == 2 and int(base.state()["stash"]["ammo"]) == 12, "switching presets returns prior supplies without duplication"):
		return
	if not require(not base.apply_preset("heavy") and int(base.state()["prepared"]["ammo"]) == 12, "unaffordable preset keeps the previous loadout"):
		return
	for id in base.state()["prepared"].keys():
		base.return_prepared(id)
	progress.profile["dna"] = 50000
	if not require(not base.upgrade_room("medical"), "medical table stays locked before base level two"):
		return
	if not require(base.upgrade_level() and base.state()["level"] == 2 and int(progress.profile["dna"]) == 49500, "base level two costs the concept's 500 DNA"):
		return
	if not require(base.upgrade_room("medical") and is_equal_approx(base.heal_multiplier(), 1.1), "medical table upgrade improves healing"):
		return
	if not require(base.recruit("medic") and not base.recruit("medic") and base.has_npc("medic"), "survivor recruitment is persistent and unique"):
		return
	base.change_morale(60)
	if not require(int(progress.profile["morale"]) == 100, "morale remains between zero and one hundred"):
		return
	var old_slots := base.stash_slots(catalog)
	if not require(base.store_supply("ammo", 25, catalog) == 25 and base.stash_slots(catalog) == old_slots and int(base.state()["stash"]["ammo"]) == 49, "warehouse stacks supplies"):
		return
	if not require(base.store_supply("medkit", 1, catalog) == 1, "warehouse accepts single-slot medical supplies"):
		return
	if not require(base.prepare_supply("ammo", 15) and int(base.state()["stash"]["ammo"]) == 34, "loadout reserves supplies without duplication"):
		return
	var prepared := base.take_prepared()
	if not require(int(prepared["ammo"]) == 15 and base.state()["prepared"].is_empty(), "starting a run consumes the reserved loadout"):
		return
	while int(base.state()["level"]) < 7:
		base.upgrade_level()
	base.upgrade_room("generator")
	base.upgrade_room("farm")
	base.sync_time(100000.0)
	var old_dna := int(progress.profile["dna"])
	base.sync_time(103600.0)
	if not require(int(progress.profile["dna"]) > old_dna and float(base.state()["resources"]["food"]) > 0.0, "generator and farm produce resources over elapsed time"):
		return
	base.sync_time(132400.0)
	if not require(int(base.state()["waves"]) >= 1 and not bool(base.last_wave()["defended"]), "eight-hour night wave reports insufficient defenses"):
		return
	for rank in 3:
		base.upgrade_room("turret")
	base.sync_time(161200.0)
	if not require(bool(base.last_wave()["defended"]) and base.wave_defense() >= base.wave_threat(), "turret upgrades defend the next wave"):
		return
	print("PASS: base upgrades, presets, warehouse, timed resources and reported night waves")
	quit(0)
