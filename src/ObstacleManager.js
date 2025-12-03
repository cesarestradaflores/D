// -----------------------------------------------------------------
// --- ObstacleManager.js - POWER-UPS (CORREGIDO - Memory Leaks Fix)
// -----------------------------------------------------------------

import * as THREE from 'three';
import { Config } from './Config.js';
import { ObstacleItem } from './ObstacleItem.js';

export class ObstacleManager {
    constructor(scene, assets) {
        this.scene = scene;
        this.assets = assets;
        this.obstacles = [];
        this.coins = [];
        this.powerUps = [];

        this.spawnTimer = 2;
        this.baseSpawnRate = 2;
        this.difficultyLevel = 1;
        
        console.log("✅ ObstacleManager inicializado - Compatible con VR");
    }
    
    spawnSet() {
        const lane = Math.floor(Math.random() * 3);
        const obstacleType = this.getRandomObstacleType();
        
        this.spawnObstacle(lane, obstacleType);
        
        // Generar power-up ocasionalmente
        if (Math.random() < Config.POWERUP_SPAWN_CHANCE) {
            const powerUpLane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
            this.spawnPowerUp(powerUpLane);
        } else if (this.difficultyLevel >= 3 && Math.random() > 0.6) {
            const secondLane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
            this.spawnObstacle(secondLane, this.getRandomObstacleType());
        }
        
        // MONEDAS - línea recta en un carril
        const coinLane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
        for(let i = 0; i < 5; i++) {
            this.spawnCoin(coinLane, Config.SPAWN_Z - i * 3);
        }
    }

    getRandomObstacleType() {
        const rand = Math.random();
        if (rand < 0.33) {
            return Config.OBSTACLE_TYPE.BARRIER;
        } else if (rand < 0.66) {
            return Config.OBSTACLE_TYPE.WALL;
        } else {
            return Config.OBSTACLE_TYPE.BARREL;
        }
    }

    spawnObstacle(lane, type) {
        let model;
        let positionY = 0;
        let scale = 1;
        
        switch (type) {
            case Config.OBSTACLE_TYPE.BARRIER:
                model = this.assets.barrier.clone();
                positionY = 0;
                scale = 0.015;
                break;
                
            case Config.OBSTACLE_TYPE.WALL:
                model = this.assets.car.clone();
                positionY = 0.5;
                scale = 0.012;
                break;
                
            case Config.OBSTACLE_TYPE.BARREL: 
                model = this.assets.barrel.clone();
                positionY = 1.0;
                scale = 0.02;
                break;
                
            default:
                model = this.assets.barrier.clone();
                scale = 0.015;
        }

        model.scale.set(scale, scale, scale);

        const obstacle = new ObstacleItem(model, this.scene);
        obstacle.type = type;
        
        obstacle.mesh.position.x = (lane - 1) * Config.LANE_WIDTH;
        obstacle.mesh.position.y = positionY;
        obstacle.mesh.position.z = Config.SPAWN_Z;
        
        this.obstacles.push(obstacle);
    }

    spawnCoin(lane, zPos) {
        const coinModel = this.assets.coin.clone();
        const coin = new ObstacleItem(coinModel, this.scene);
        coin.type = Config.OBSTACLE_TYPE.COIN;
        
        coin.mesh.position.x = (lane - 1) * Config.LANE_WIDTH;
        coin.mesh.position.y = 1.5;
        coin.mesh.position.z = zPos;
        this.coins.push(coin);
    }

    spawnPowerUp(lane) {
        try {
            // NUEVO: Más tipos de power-ups
            const powerUpTypes = [
                Config.POWERUP_TYPE.MAGNET,
                Config.POWERUP_TYPE.DOUBLE,
                Config.POWERUP_TYPE.SHIELD,
                Config.POWERUP_TYPE.SLOWMO
            ];
            
            const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            
            let model;
            
            switch (powerUpType) {
                case Config.POWERUP_TYPE.MAGNET:
                    model = this.assets.dartboard.clone();
                    break;
                    
                case Config.POWERUP_TYPE.DOUBLE:
                    model = this.assets.pipeWrench.clone();
                    break;
                    
                case Config.POWERUP_TYPE.SHIELD:
                    model = this.assets.dartboard.clone(); // Temporal, usar otro modelo
                    break;
                    
                case Config.POWERUP_TYPE.SLOWMO:
                    model = this.assets.pipeWrench.clone(); // Temporal, usar otro modelo
                    break;
                    
                default:
                    console.error("❌ Tipo de power-up desconocido:", powerUpType);
                    return;
            }

            model.castShadow = true;
            model.receiveShadow = true;

            const powerUp = new ObstacleItem(model, this.scene);
            powerUp.type = "POWERUP";
            powerUp.powerUpType = powerUpType;
            
            powerUp.mesh.position.x = (lane - 1) * Config.LANE_WIDTH;
            powerUp.mesh.position.y = 1.6;
            powerUp.mesh.position.z = Config.SPAWN_Z;
            
            // Animación flotante
            powerUp.originalY = powerUp.mesh.position.y;
            powerUp.floatTime = 0;
            
            // NUEVO: Marcar como seleccionable para VR
            powerUp.mesh.userData = {
                selectable: true,
                powerUpType: powerUpType,
                onSelect: () => {
                    console.log(`⚡ Power-up ${powerUpType} seleccionado por mirada/apuntado`);
                }
            };
            
            this.powerUps.push(powerUp);
            
            console.log(`⚡ Power-up generado: ${powerUpType}`);
            
        } catch (error) {
            console.error("❌ Error al generar power-up:", error);
        }
    }

    update(deltaTime, speed, distance, playerPosition, activePowerUps) {
        this.updateDifficulty(distance);
        
        this.spawnTimer -= deltaTime;
        if (this.spawnTimer <= 0) {
            this.spawnSet();
            this.spawnTimer = this.baseSpawnRate / (this.difficultyLevel * 0.7) + Math.random() * 0.8;
        }

        // Actualizar obstáculos
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.mesh.position.z += speed * deltaTime;
            obstacle.updateBoundingBox();

            if (obstacle.mesh.position.z > Config.DESPAWN_Z) {
                this.safeRemoveObstacle(obstacle, i);
            }
        }

        // Actualizar monedas
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.mesh.position.z += speed * deltaTime;
            coin.mesh.rotation.z += 5 * deltaTime;
            coin.updateBoundingBox();
            
            // Efecto de imán si está activo
            if (activePowerUps.magnet && activePowerUps.magnet.active) {
                const distanceToPlayer = Math.sqrt(
                    Math.pow(coin.mesh.position.x - playerPosition.x, 2) +
                    Math.pow(coin.mesh.position.z - playerPosition.z, 2)
                );
                
                if (distanceToPlayer < 10.0) {
                    const directionX = playerPosition.x - coin.mesh.position.x;
                    const directionZ = playerPosition.z - coin.mesh.position.z;
                    
                    coin.mesh.position.x += directionX * deltaTime * 15;
                    coin.mesh.position.z += directionZ * deltaTime * 15;
                }
            }
            
            if (coin.mesh.position.z > Config.DESPAWN_Z) {
                this.safeRemoveCoin(coin, i);
            }
        }

        // Actualizar power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.mesh.position.z += speed * deltaTime;
            
            // Animación para power-ups
            powerUp.floatTime += deltaTime;

            // Rotación (Solo en Y)
            powerUp.mesh.rotation.y += deltaTime * 3;

            // Efecto de brillo
            if (powerUp.mesh.material) {
                const glowIntensity = (Math.sin(powerUp.floatTime * 10) + 1) * 0.3 + 0.4;
                
                // Diferentes colores para diferentes power-ups
                let glowColor;
                switch(powerUp.powerUpType) {
                    case Config.POWERUP_TYPE.MAGNET:
                        glowColor = 0xFF0000; // Rojo
                        break;
                    case Config.POWERUP_TYPE.DOUBLE:
                        glowColor = 0xFFFF00; // Amarillo
                        break;
                    case Config.POWERUP_TYPE.SHIELD:
                        glowColor = 0x00FF00; // Verde
                        break;
                    case Config.POWERUP_TYPE.SLOWMO:
                        glowColor = 0x00FFFF; // Cian
                        break;
                    default:
                        glowColor = 0xFFFFFF;
                }
                
                powerUp.mesh.material.emissive = new THREE.Color(glowColor).multiplyScalar(glowIntensity);
            }
            
            powerUp.updateBoundingBox();
            
            if (powerUp.mesh.position.z > Config.DESPAWN_Z) {
                this.safeRemovePowerUp(powerUp, i);
            }
        }
    }

    // NUEVO: Métodos seguros para remover objetos (Memory Leaks Fix)
    safeRemoveObstacle(obstacle, index) {
        this.disposeObject(obstacle.mesh);
        obstacle.removeFromScene();
        this.obstacles.splice(index, 1);
    }
    
    safeRemoveCoin(coin, index) {
        this.disposeObject(coin.mesh);
        coin.removeFromScene();
        this.coins.splice(index, 1);
    }
    
    safeRemovePowerUp(powerUp, index) {
        this.disposeObject(powerUp.mesh);
        powerUp.removeFromScene();
        this.powerUps.splice(index, 1);
    }
    
    disposeObject(mesh) {
        if (!mesh) return;
        
        // Limpiar geometría
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        
        // Limpiar material(es)
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(material => material.dispose());
            } else {
                mesh.material.dispose();
            }
        }
        
        // Limpiar texturas si existen
        if (mesh.material && mesh.material.map) {
            mesh.material.map.dispose();
        }
        
        if (mesh.material && mesh.material.emissiveMap) {
            mesh.material.emissiveMap.dispose();
        }
        
        if (mesh.material && mesh.material.normalMap) {
            mesh.material.normalMap.dispose();
        }
        
        if (mesh.material && mesh.material.displacementMap) {
            mesh.material.displacementMap.dispose();
        }
    }

    updateDifficulty(distance) {
        const newDifficulty = Math.floor(distance / Config.DIFFICULTY_INTERVAL) + 1;
        if (newDifficulty > this.difficultyLevel) {
            this.difficultyLevel = newDifficulty;
        }
    }

    // CORREGIDO: Reset con limpieza de memoria
    reset() {
        console.log("🔄 Reseteando ObstacleManager...");

        // Limpiar obstáculos con dispose
        let obstaclesRemoved = 0;
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            if (obstacle && obstacle.mesh) {
                this.disposeObject(obstacle.mesh);
                obstacle.removeFromScene();
                obstaclesRemoved++;
            }
        }
        this.obstacles = [];

        // Limpiar monedas con dispose
        let coinsRemoved = 0;
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            if (coin && coin.mesh) {
                this.disposeObject(coin.mesh);
                coin.removeFromScene();
                coinsRemoved++;
            }
        }
        this.coins = [];

        // Limpiar power-ups con dispose
        let powerUpsRemoved = 0;
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            if (powerUp && powerUp.mesh) {
                this.disposeObject(powerUp.mesh);
                powerUp.removeFromScene();
                powerUpsRemoved++;
            }
        }
        this.powerUps = [];

        this.spawnTimer = 2;
        this.difficultyLevel = 1;
        
        console.log(`✅ ObstacleManager reiniciado - Limpiados ${obstaclesRemoved} obstáculos, ${coinsRemoved} monedas, ${powerUpsRemoved} power-ups`);
    }
    
    collectCoin(coin) {
        if (!coin || !coin.mesh) {
            console.warn("⚠️ Intento de recolectar moneda inválida");
            return;
        }
        
        this.disposeObject(coin.mesh);
        coin.removeFromScene();
        
        const index = this.coins.indexOf(coin);
        if (index > -1) {
            this.coins.splice(index, 1);
        }
    }

    collectPowerUp(powerUp) {
        if (!powerUp || !powerUp.mesh) {
            console.error("❌ Power-up inválido en collectPowerUp");
            return null;
        }
        
        if (!powerUp.powerUpType) {
            console.error("❌ Power-up sin tipo definido:", powerUp);
            return null;
        }
        
        // Remover de la escena con limpieza
        this.disposeObject(powerUp.mesh);
        powerUp.removeFromScene();
        
        // Remover del array
        const index = this.powerUps.indexOf(powerUp);
        if (index > -1) {
            this.powerUps.splice(index, 1);
        }
        
        return powerUp.powerUpType;
    }
}