// -----------------------------------------------------------------
// --- VRAchievements.js (SISTEMA DE LOGROS VR)
// -----------------------------------------------------------------

export class VRAchievements {
    constructor() {
        this.achievements = {
            firstVR: { 
                unlocked: false, 
                name: "🎮 Primera inmersión VR",
                description: "Iniciar sesión VR por primera vez",
                icon: "👓"
            },
            noCollisions100m: { 
                unlocked: false, 
                name: "🎯 100m sin colisiones",
                description: "Recorrer 100 metros sin chocar",
                icon: "✅"
            },
            vrMarathon: { 
                unlocked: false, 
                name: "🏃‍♂️ Maratón VR",
                description: "Jugar 5 minutos en modo VR",
                icon: "⏱️"
            },
            coinCollector: { 
                unlocked: false, 
                name: "💰 Coleccionista",
                description: "Recolectar 50 monedas",
                icon: "🪙"
            },
            powerUpMaster: { 
                unlocked: false, 
                name: "⚡ Maestro de Power-ups",
                description: "Activar 10 power-ups",
                icon: "✨"
            },
            difficulty5: { 
                unlocked: false, 
                name: "🔥 Nivel 5 alcanzado",
                description: "Alcanzar nivel de dificultad 5",
                icon: "📈"
            },
            perfectRun: { 
                unlocked: false, 
                name: "🌟 Carrera Perfecta",
                description: "30 segundos sin cambiar de carril",
                icon: "⭐"
            },
            comboMaster: { 
                unlocked: false, 
                name: "🎯 Combo Maestro",
                description: "2 power-ups activos simultáneamente",
                icon: "🌀"
            }
        };
        
        this.unlockedAchievements = [];
        this.achievementCallbacks = [];
    }
    
    checkAchievements(gameStats) {
        // Verificar logros basados en estadísticas
        if (gameStats.distance > 100 && gameStats.collisions === 0) {
            this.unlock('noCollisions100m');
        }
        
        if (gameStats.timeInVR > 300) { // 5 minutos en VR
            this.unlock('vrMarathon');
        }
        
        if (gameStats.coinsCollected >= 50) {
            this.unlock('coinCollector');
        }
        
        if (gameStats.powerUpsCollected >= 10) {
            this.unlock('powerUpMaster');
        }
        
        // Verificar carril perfecto (se necesitaría tracking adicional)
        // Verificar combo (se maneja en Game.js)
    }
    
    unlock(achievementId) {
        if (!this.achievements[achievementId]) {
            console.error("❌ Logro no encontrado:", achievementId);
            return false;
        }
        
        if (!this.achievements[achievementId].unlocked) {
            this.achievements[achievementId].unlocked = true;
            this.unlockedAchievements.push(achievementId);
            
            console.log(`🏆 LOGRO DESBLOQUEADO: ${this.achievements[achievementId].name}`);
            
            // Mostrar notificación
            this.showNotification(this.achievements[achievementId]);
            
            // Ejecutar callbacks
            this.achievementCallbacks.forEach(callback => {
                callback(achievementId, this.achievements[achievementId]);
            });
            
            return true;
        }
        return false;
    }
    
    showNotification(achievement) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            animation: achievementSlideIn 0.5s ease-out, achievementSlideOut 0.5s ease-in 2.5s;
            animation-fill-mode: forwards;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            min-width: 300px;
            transform: translateX(400px);
            border-left: 5px solid gold;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2rem;">${achievement.icon}</div>
                <div>
                    <div style="font-weight: bold; font-size: 1.1rem;">${achievement.name}</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">${achievement.description}</div>
                </div>
            </div>
        `;
        
        // Añadir estilos de animación si no existen
        if (!document.getElementById('achievement-styles')) {
            const style = document.createElement('style');
            style.id = 'achievement-styles';
            style.textContent = `
                @keyframes achievementSlideIn {
                    0% { transform: translateX(400px); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                @keyframes achievementSlideOut {
                    0% { transform: translateX(0); opacity: 1; }
                    100% { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
    
    // Métodos para UI
    getUnlockedAchievements() {
        return this.unlockedAchievements.map(id => this.achievements[id]);
    }
    
    getAchievementProgress(gameStats) {
        const progress = {};
        
        // Calcular progreso para cada logro
        if (gameStats.distance > 0) {
            progress.noCollisions100m = Math.min(100, (gameStats.distance / 100) * 100);
        }
        
        if (gameStats.timeInVR > 0) {
            progress.vrMarathon = Math.min(100, (gameStats.timeInVR / 300) * 100);
        }
        
        if (gameStats.coinsCollected > 0) {
            progress.coinCollector = Math.min(100, (gameStats.coinsCollected / 50) * 100);
        }
        
        if (gameStats.powerUpsCollected > 0) {
            progress.powerUpMaster = Math.min(100, (gameStats.powerUpsCollected / 10) * 100);
        }
        
        return progress;
    }
    
    // Para suscribirse a eventos de logros
    onAchievementUnlocked(callback) {
        this.achievementCallbacks.push(callback);
    }
}