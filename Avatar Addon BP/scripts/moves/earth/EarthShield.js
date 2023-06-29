import { system, MolangVariableMap } from '@minecraft/server'
import { getScore, setScore, delayedFunc, calculateKnockbackVector } from "./../../util.js";

const command = {
    name: 'Earth Shield',
    description: 'Protect yourself from damage!',
    style: 'earth',
    unlockable: 4,
    unlockable_for_avatar: 45,
    execute(player) {
		// Setup
		setScore(player, "cooldown", 0);
		if (!getScore("ground", player)) return player.sendMessage("§cYou must be grounded to use this move.");

		player.addEffect("resistance", 25, { amplifier: 255, showParticles: false });
		player.runCommandAsync("camerashake add @s 0.4 0.1 positional");
		player.playAnimation("animation.earth.push");

		delayedFunc(player, (waterShield) => {
			player.addTag("bendingShield");
            player.dimension.spawnParticle("a:earth_shield", player.location, new MolangVariableMap());
			let spawnPos = player.location;
			let currentTick = 0;

			const sched_ID = system.runInterval(function tick() {
				// In case of errors
				currentTick++;
				if (currentTick > 100) return system.clearRun(sched_ID);

				// Get entities
				const dimension = player.dimension;
				const entities = [...dimension.getEntities({ location: spawnPos, maxDistance: 6, excludeNames: [player.name], excludeFamilies: ["inanimate"], excludeTypes: ["item"], excludeTags: ["bending_dmg_off"] })];
				const items = [...dimension.getEntities({ location: spawnPos, maxDistance: 6, type: "item" })];
			
				// Loop through all nearby entities (not items though)
				entities.forEach(entity => {
					const kbVector = calculateKnockbackVector(entity.location, spawnPos, 1);
					try { entity.clearVelocity() } catch (error) {}
					try {
						entity.applyKnockback(kbVector.x, kbVector.z, 1, 0);
					} catch (error) {
						entity.applyImpulse(calculateKnockbackVector(entity.location, spawnPos, 0.1));
					}
				});
				items.forEach(item => { item.applyImpulse(calculateKnockbackVector(item.location, spawnPos, 0.3)); });

				// The end of the runtime
				if (currentTick > 35) {
					setScore(player, "cooldown", 0);
					player.removeTag("bendingShield");
					return system.clearRun(sched_ID);
				}
			}, 1);
		}, 10);
    }
}

export default command