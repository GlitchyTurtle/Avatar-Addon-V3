import { system } from "@minecraft/server";
import { calcVectorOffset, applyBendingDamage, calculateDistance, delayedFunc, getEntitiesNearViewDirection, findDesireableTarget, traceLine } from "../../../../utils.js";

import { ALL_PROJECTILES } from "../../../../index.js";

const move = {
    name: { translate: 'elements.fire.moves.scorpionsting.name' },
    description: { translate: 'elements.fire.moves.scorpionsting.description' },

    cost: 50,
    cooldown: 10,
    type: 'standard',

    id: 50,

    damage: {
        base: 4,
        multiplied: 12
    },

    activate(player, PLAYER_DATA) {
        player.playAnimation("animation.air.blast");

        delayedFunc(player, () => PLAYER_DATA.dimension.playSound("avatar.fire_blast", player.location, { volume: 1.5, pitch: 1 + Math.random() * 0.2 }), 4);

        const levelCheck = PLAYER_DATA.level >= 100;
        const fireType = (levelCheck) ? "a:fire_blue_blast" : "a:fire_blast";
        const flutterType = (levelCheck) ? "a:fire_flutter_blue" : "a:fire_flutter";
        const fireTypePop = (levelCheck) ? "a:fire_blue_blast_pop" : "a:fire_blast_pop";    

        delayedFunc(player, () => {
            let travelDir = { x: 0, y: 0, z: 0 };
            const viewDir = PLAYER_DATA.viewDir;
            const startPosition = player.location;

            player.runCommand(`camerashake add @s 0.1 0.05 positional`);

            let currentTick = -0.2;
            let endRuntime = false;
            let loc = startPosition;
            let prevLoc = startPosition;

            // Find the nearest entity, and the view direction towards it (sorta)
            const entities = getEntitiesNearViewDirection(player, 32, 10);
            const entity = findDesireableTarget(entities);

            const sched_ID = system.runInterval(function tick() {
                // In case of errors
                currentTick += 0.05;
                if (currentTick > 27) {
                    delete ALL_PROJECTILES[sched_ID];
                    return system.clearRun(sched_ID);
                }

                if (entity) {
                    travelDir = { x: entity.location.x - loc.x, y: entity.location.y - loc.y - 2, z: entity.location.z - loc.z };
                    const length = Math.sqrt(travelDir.x * travelDir.x + travelDir.y * travelDir.y + travelDir.z * travelDir.z);
                    travelDir = { x: travelDir.x / length, y: travelDir.y / length, z: travelDir.z / length };
                } else {
                    const targetXZ = calcVectorOffset(player, 0, 0, 16, viewDir, player.location);
                    const target = PLAYER_DATA.dimension.getTopmostBlock({ x: targetXZ.x, z: targetXZ.z }, targetXZ.y + 30);

                    travelDir = { x: target.x - loc.x, y: target.y - loc.y - 2, z: target.z - loc.z };
                    const length = Math.sqrt(travelDir.x * travelDir.x + travelDir.y * travelDir.y + travelDir.z * travelDir.z);
                    travelDir = { x: travelDir.x / length, y: travelDir.y / length, z: travelDir.z / length };
                }

                // Overhead down spike
                loc = calcVectorOffset(player, 0, 1, currentTick, travelDir, loc);

                // Slight arc normal
                loc = calcVectorOffset(player, 0, 1, 1, travelDir, loc);

                if (ALL_PROJECTILES[sched_ID] === undefined) {
                    ALL_PROJECTILES[sched_ID] = { id: sched_ID, loc: loc, collision: false, watchForIds: [], type: 'fire' };

                    // Are there any projectiles nearby?
                    for (const projectile of Object.values(ALL_PROJECTILES)) {
                        if (projectile.id != sched_ID && calculateDistance(projectile.loc, loc) < 64) {
                            ALL_PROJECTILES[sched_ID].watchForIds.push(projectile.id);
                        }
                    }
                } else {
                    const projectile = ALL_PROJECTILES[sched_ID];
                    projectile.loc = loc;
                    if (projectile.collision) endRuntime = true;
                }

                // Apply bending damage to nearby entities
                const nearbyEntities = [...PLAYER_DATA.dimension.getEntities({ location: loc, maxDistance: 3, excludeNames: [player.name], excludeFamilies: ["inanimate"], excludeTypes: ["item"], excludeTags: ["bending_dmg_off"] })];
                nearbyEntities.forEach(entity => applyBendingDamage(player, entity, (4 + PLAYER_DATA.levelFactor * 12), 4, false, true));
                if (nearbyEntities[0] != undefined) endRuntime = true;

                // Check if the block is passable
                const rayCast = PLAYER_DATA.dimension.getBlockFromRay(loc, travelDir, { includePassableBlocks: false, includeLiquidBlocks: false, maxDistance: 1 });
                if (rayCast) endRuntime = true;

                // Spawn the particle
                traceLine(player, loc, prevLoc, 4, fireType);
                prevLoc = loc;

                PLAYER_DATA.dimension.spawnParticle(flutterType, loc);

                // The end of the runtime
                if (currentTick > 15 || endRuntime) {
                    // Particle effects and sound
                    PLAYER_DATA.dimension.spawnParticle(fireTypePop, loc);

                    PLAYER_DATA.dimension.playSound("avatar.debris", loc, { volume: 1.7, pitch: 1 + Math.random() * 0.2 });
                    PLAYER_DATA.dimension.playSound("random.explode", loc, { volume: 5.7, pitch: 1 - Math.random() * 0.2 });

                    delete ALL_PROJECTILES[sched_ID];
                    return system.clearRun(sched_ID);
                }
            }, 1);
        }, 8);
    }
}

export default move;