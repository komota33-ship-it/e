extends SceneTree

func _initialize() -> void:
	call_deferred("run_checks")

func check(value: bool, reason: String) -> bool:
	if not value:
		printerr("FAIL: %s" % reason)
		quit(1)
		return false
	return true

func boss_on(game: Variant, floor_number: int) -> Dictionary:
	game.load_floor(floor_number)
	for enemy in game.enemies:
		if enemy["boss"]:
			return enemy
	return {}

func run_checks() -> void:
	var game: Variant = load("res://godot/main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game.test_mode = true
	game.progression.test_mode = true
	game.menu_open = false
	game.menu_backdrop.visible = false
	game.close_panel()
	game.reset_inventory()
	var attacking_walker: Dictionary = game.make_enemy("walker", 350.0)
	game.begin_enemy_attack(attacking_walker, "melee")
	var melee_duration: float = attacking_walker["attack_duration"]
	if not check(game.attack_frame(melee_duration, melee_duration, 8) == 0 and game.attack_frame(float(attacking_walker["impact_at"]), melee_duration, 8) == 3 and game.attack_frame(0.01, melee_duration, 8) == 7, "walker attack moves from windup through contact to recovery frames"):
		return
	var spitting_enemy: Dictionary = game.make_enemy("spitter", 400.0)
	game.begin_enemy_attack(spitting_enemy, "spit")
	if not check(game.attack_frame(float(spitting_enemy["attack_duration"]), float(spitting_enemy["attack_duration"]), 8) == 0 and float(spitting_enemy["attack_duration"]) > melee_duration, "spit animation uses its own longer timing"):
		return
	var matriarch := boss_on(game, 5)
	if not check(matriarch["type"] == "matriarch" and matriarch["hp"] == 300, "matriarch floor and health"):
		return
	game.player_x = matriarch["x"] - 180.0
	matriarch["hp"] = 190
	matriarch["cooldown"] = 0
	game.update_enemy(matriarch, 0.1, game.progression.effects())
	game.update_enemy(matriarch, 1.5, game.progression.effects())
	if not check(game.enemies.size() > 5, "matriarch summons walkers"):
		return
	var alpha := boss_on(game, 10)
	if not check(alpha["type"] == "alpha" and alpha["hp"] == 250, "alpha floor and health"):
		return
	var carapace := boss_on(game, 15)
	game.damage_enemy(carapace, 100, carapace["x"] - 180.0)
	if not check(absf(carapace["hp"] - 485.0) < 0.01, "carapace blocks front shots"):
		return
	game.damage_enemy(carapace, 100, carapace["x"] + 180.0)
	if not check(absf(carapace["hp"] - 335.0) < 0.01, "carapace vulnerable from behind"):
		return
	var chimera := boss_on(game, 20)
	if not check(chimera["type"] == "chimera" and chimera["mutations"].size() == 2, "chimera has two mutations"):
		return
	var mama := boss_on(game, 25)
	game.damage_enemy(mama, 625, mama["x"] - 180.0)
	if not check(mama["surrendered"] and not mama["dead"], "Mama surrenders before death"):
		return
	game.player_x = mama["x"]
	game.current_action = game.nearest_action()
	if not check(game.current_action.get("type") == "spare", "mercy choice appears near Mama"):
		return
	game.interact()
	if not check(mama["dead"] and mama.get("spared", false) and game.bag.total("antidote") == 1, "mercy gives antidote"):
		return
	var elena := boss_on(game, 30)
	game.damage_enemy(elena, 420, elena["x"] - 180.0)
	if not check(game.enemies.filter(func(enemy: Dictionary) -> bool: return enemy["type"] == "elena_echo").size() == 2, "Elena splits at half health"):
		return
	var zero := boss_on(game, 0)
	if not check(zero["type"] == "boss" and zero["hp"] == 1500, "Object 0 in B1"):
		return
	game.player_x = zero["x"] - 200.0
	zero["cooldown"] = 0
	game.update_enemy(zero, 0.1, game.progression.effects())
	game.update_enemy(zero, 1.5, game.progression.effects())
	if not check(game.projectiles.size() == 3, "Object 0 fires acid volley"):
		return
	var brute: Dictionary = game.make_enemy("brute", game.player_x + 250.0)
	game.enemies.append(brute)
	game.damage_enemy(brute, 1000, game.player_x)
	game.update_enemy(brute, 0.66, game.progression.effects())
	if not check(brute["burst"] and game.effects.any(func(effect: Dictionary) -> bool: return effect.get("kind") == "explosion"), "brute explodes after falling"):
		return
	game.load_floor(51)
	game.enemies.clear()
	game.player_x = 100.0
	game.health = 100
	var target: Dictionary = game.make_enemy("walker", 350.0)
	target["hp"] = 100.0
	target["maxHp"] = 100.0
	game.enemies.append(target)
	game.fire_timer = 0.0
	game.shoot(Vector2(350.0, game.GROUND - 110.0))
	var head_damage: float = 100.0 - float(target["hp"])
	target["hp"] = 100.0
	game.fire_timer = 0.0
	game.shoot(Vector2(350.0, game.GROUND - 66.0))
	var body_damage: float = 100.0 - float(target["hp"])
	target["hp"] = 100.0
	game.fire_timer = 0.0
	game.shoot(Vector2(350.0, game.GROUND - 12.0))
	var leg_damage: float = 100.0 - float(target["hp"])
	if not check(head_damage > body_damage and body_damage > leg_damage and target["slow_timer"] > 0.0, "head, torso and leg hitboxes affect damage and movement"):
		return
	game.bag.add_item("shotgun", 1, {"loaded": 6})
	for item in game.bag.items:
		if item["type"] == "shotgun":
			game.active_weapon_uid = item["uid"]
	target["hp"] = 100.0
	var rear: Dictionary = game.make_enemy("walker", 450.0)
	rear["hp"] = 100.0
	rear["maxHp"] = 100.0
	game.enemies.append(rear)
	game.fire_timer = 0.0
	game.shoot(Vector2(450.0, game.GROUND - 75.0))
	if not check(target["hp"] < 100.0 and rear["hp"] < 100.0, "shotgun pellets penetrate front zombie"):
		return
	game.effects.clear()
	var hit_subject: Dictionary = game.make_enemy("walker", 550.0)
	hit_subject["hp"] = 100.0
	hit_subject["maxHp"] = 100.0
	game.damage_enemy(hit_subject, 10.0, 100.0)
	var first_impact_count: int = game.effects.size()
	game.damage_enemy(hit_subject, 10.0, 100.0)
	if not check(first_impact_count == 4 and game.effects.size() == first_impact_count and float(hit_subject["hit_time"]) > 0.0, "rapid pellet hits share one brief visual impact"):
		return
	game.update_enemy(hit_subject, 0.16, game.progression.effects())
	if not check(float(hit_subject["hit_time"]) == 0.0 and float(hit_subject["hit_fx_cooldown"]) == 0.0, "hit reaction ends without altering the walk cycle"):
		return
	game.enemies.clear()
	var blast_victim: Dictionary = game.make_enemy("walker", 475.0)
	blast_victim["hp"] = 100.0
	blast_victim["maxHp"] = 100.0
	game.enemies.append(blast_victim)
	game.bag.add_item("grenade")
	game.use_type("grenade")
	if not check(game.grenades.size() == 1 and blast_victim["hp"] == 100.0, "grenade is thrown before it explodes"):
		return
	for step in 80:
		game.update_grenades(0.016)
	if not check(game.grenades.is_empty() and blast_victim["hp"] < 100.0, "grenade fuse damages nearby zombie after flight"):
		return
	game.layout = game.layout.duplicate(true)
	game.layout["id"] = "corpse-test"
	game.layout["containers"] = []
	game.layout["doors"] = []
	game.layout.erase("lift")
	game.enemies.clear()
	var corpse: Dictionary = game.make_enemy("walker", game.player_x)
	corpse["dead"] = true
	game.enemies.append(corpse)
	game.current_action = game.nearest_action()
	if not check(game.current_action.get("type") == "corpse", "fallen zombie becomes searchable"):
		return
	game.interact()
	game.update_search(2.0, 0.0)
	if not check(corpse["searched"] and game.spent_containers.has("corpse-test:corpse-%s" % corpse["id"]), "corpse yields loot only once"):
		return
	if not check(game.acid_cells.size() == 12 and game.acid_cells.all(func(cell: Array) -> bool: return cell[2] > 0 and cell[3] > 0), "acid flight, splash and pool frames have visible atlas bounds"):
		return
	game.projectiles.append({"x": 600.0, "y": game.GROUND - 15.0, "vx": 0.0, "vy": 100.0, "damage": 12, "ttl": 1.0, "age": 0.0, "kind": "acid"})
	game.update_projectiles(0.1)
	if not check(game.projectiles.is_empty() and game.acid_pools.size() == 1 and game.effects.any(func(effect: Dictionary) -> bool: return effect.get("kind") == "acid_splash"), "acid impact starts a textured splash and a persistent pool"):
		return
	game.update_hazards(0.6)
	game.update_effects(0.2)
	if not check(float(game.acid_pools[0]["age"]) > 0.0 and game.effects.any(func(effect: Dictionary) -> bool: return effect.get("kind") == "acid_splash" and float(effect["age"]) > 0.0), "acid pool and splash advance through their animation frames"):
		return
	game.load_floor(50)
	game.enemies.clear()
	game.player_x = 100.0
	var corridor_enemy: Dictionary = game.make_enemy("walker", 350.0)
	game.enemies.append(corridor_enemy)
	game.fire_timer = 0.0
	game.shoot(Vector2(350.0, game.actor_ground() - 72.0))
	if not check(corridor_enemy["hp"] < corridor_enemy["maxHp"], "corridor hitbox follows actors to the middle of the floor"):
		return
	print("PASS: bosses, shot impacts, corpse search and animated acid")
	quit(0)
