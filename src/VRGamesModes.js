// -----------------------------------------------------------------
// --- VRGameModes.js (MODOS DE JUEGO VR)
// -----------------------------------------------------------------

import { Config } from './Config.js';

export class VRGameModes {
    constructor(game) {
        this.game = game;
        this.modes = {
            classic: { 
                id: 'classic',
                name: '🎮 Clásico',
                description: 'Modo de juego estándar',
                speed: Config.GAME_START_SPEED,
                obstacles: 'normal',
                powerUps: true,
                timeLimit: null,
                features: []
            },
            timeAttack: { 
                id: 'timeAttack',
                name: '⏱️ Contra Reloj',
                description: '¡Supera la distancia en 2 minutos!',
                speed: 20,
                obstacles: 'frequent',
                powerUps: true,
                timeLimit: 120, // 2 minutos
                features: ['timer', 'timeBonus']
            },
            zenMode: { 
                id: 'zenMode',
                name: '😌 Modo Zen',
                description: 'Relájate y disfruta del paisaje VR',
                speed: 8,
                obstacles: 'few',
                powerUps: false,
                timeLimit: null,
                features: ['noGameOver', 'relaxingMusic']
            },
            mirror: { 
                id: 'mirror',
                name: '🪞 Modo Espejo',
                description: 'Controles invertidos - ¡Desafío extra!',
                speed: Config.GAME_START_SPEED,
                obstacles: 'normal',
                powerUps: true,
                timeLimit: null,
                features: ['reverseControls', 'mirroredWorld']
            }
        };
        
        this.currentMode = 'classic';
        this.modeTimer = 0;
        this.modeActive = false;
        
        // UI elements
        this.createModeUI();
    }
    
    createModeUI() {
        // Contenedor para información del modo
        const modeInfo = document.createElement('div');
        modeInfo.id = 'mode-info';
        modeInfo.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            z-index: 99;
            display: none;
            font-size: 14px;
            border-left: 4px solid #00FF41;
            min-width: 200px;
        `;
        
        modeInfo.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;" id="mode-name">🎮 Clásico</div>
            <div style="font-size: 12px; opacity: 0.8;" id="mode-description">Modo de juego estándar</div>
            <div style="margin-top: 8px; display: none;" id="mode-timer">
                <div style="display: flex; justify-content: space-between;">
                    <span>Tiempo:</span>
                    <span id="timer-value">02:00</span>
                </div>
                <div style="background: #333; height: 4px; border-radius: 2px; margin-top: 5px;">
                    <div id="timer-bar" style="background: #00FF41; height: 100%; width: 100%; border-radius: 2px;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modeInfo);
        
        // Selector de modos para el menú
        this.createModeSelector();
    }
    
    createModeSelector() {
        // Añadir selector al menú principal si existe
        const rulesModal = document.getElementById('rules-modal');
        if (rulesModal) {
            const selectorHTML = `
                <div style="margin: 20px 0;">
                    <div style="color: #00FF41; font-size: 1.2rem; margin-bottom: 10px;">MODO DE JUEGO</div>
                    <select id="mode-selector" style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(0, 255, 65, 0.1);
                        border: 2px solid #00FF41;
                        border-radius: 8px;
                        color: white;
                        font-size: 1rem;
                    ">
                        <option value="classic">🎮 Clásico</option>
                        <option value="timeAttack">⏱️ Contra Reloj</option>
                        <option value="zenMode">😌 Modo Zen</option>
                        <option value="mirror">🪞 Modo Espejo</option>
                    </select>
                    <div id="mode-details" style="
                        margin-top: 10px;
                        padding: 10px;
                        background: rgba(0, 255, 65, 0.05);
                        border-radius: 5px;
                        font-size: 0.9rem;
                        color: #cccccc;
                    ">
                        Modo de juego estándar
                    </div>
                </div>
            `;
            
            const controlsSection = rulesModal.querySelector('.controls-section');
            if (controlsSection) {
                controlsSection.insertAdjacentHTML('afterend', selectorHTML);
                
                // Configurar eventos
                const selector = document.getElementById('mode-selector');
                const details = document.getElementById('mode-details');
                
                selector.addEventListener('change', (e) => {
                    const modeId = e.target.value;
                    const mode = this.modes[modeId];
                    details.textContent = mode.description;
                });
                
                // Inicializar descripción
                details.textContent = this.modes.classic.description;
            }
        }
    }
    
    setMode(modeId) {
        if (!this.modes[modeId]) {
            console.error("❌ Modo de juego no encontrado:", modeId);
            return false;
        }
        
        this.currentMode = modeId;
        const mode = this.modes[modeId];
        
        console.log(`🎮 Cambiando a modo: ${mode.name}`);
        
        // Aplicar configuraciones del modo
        this.applyModeSettings(mode);
        
        // Actualizar UI
        this.updateModeUI(mode);
        
        // Iniciar timer si el modo lo requiere
        if (mode.timeLimit) {
            this.startModeTimer(mode.timeLimit);
        }
        
        return true;
    }
    
    applyModeSettings(mode) {
        // Aplicar velocidad
        this.game.gameSpeed = mode.speed;
        
        // Configurar spawn rates basado en dificultad
        if (this.game.obstacleManager) {
            switch(mode.obstacles) {
                case 'frequent':
                    this.game.obstacleManager.baseSpawnRate = 1.0;
                    break;
                case 'few':
                    this.game.obstacleManager.baseSpawnRate = 3.0;
                    break;
                default:
                    this.game.obstacleManager.baseSpawnRate = 2.0;
            }
        }
        
        // Configurar características especiales
        if (mode.features.includes('reverseControls')) {
            this.setupReverseControls();
        }
        
        if (mode.features.includes('noGameOver')) {
            this.setupNoGameOver();
        }
        
        // Configurar música si es necesario
        if (mode.features.includes('relaxingMusic')) {
            this.setupRelaxingMusic();
        }
    }
    
    updateModeUI(mode) {
        const modeInfo = document.getElementById('mode-info');
        const modeName = document.getElementById('mode-name');
        const modeDescription = document.getElementById('mode-description');
        const timerSection = document.getElementById('mode-timer');
        
        if (modeInfo && modeName && modeDescription) {
            modeInfo.style.display = 'block';
            modeName.textContent = mode.name;
            modeDescription.textContent = mode.description;
            
            // Mostrar/ocultar timer
            if (mode.timeLimit) {
                timerSection.style.display = 'block';
            } else {
                timerSection.style.display = 'none';
            }
        }
        
        // Actualizar selector en menú
        const selector = document.getElementById('mode-selector');
        if (selector) {
            selector.value = mode.id;
        }
    }
    
    startModeTimer(timeLimit) {
        this.modeTimer = timeLimit;
        this.modeActive = true;
        
        console.log(`⏱️ Timer iniciado: ${timeLimit} segundos`);
        
        // Actualizar timer cada segundo
        const timerInterval = setInterval(() => {
            if (!this.modeActive || this.game.isPaused || this.game.isGameOver) {
                return;
            }
            
            this.modeTimer -= 1;
            
            // Actualizar UI
            this.updateTimerUI();
            
            // Verificar si se acabó el tiempo
            if (this.modeTimer <= 0) {
                clearInterval(timerInterval);
                this.onTimeUp();
            }
        }, 1000);
    }
    
    updateTimerUI() {
        const timerValue = document.getElementById('timer-value');
        const timerBar = document.getElementById('timer-bar');
        
        if (timerValue && timerBar) {
            const minutes = Math.floor(this.modeTimer / 60);
            const seconds = this.modeTimer % 60;
            timerValue.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const mode = this.modes[this.currentMode];
            const percentage = (this.modeTimer / mode.timeLimit) * 100;
            timerBar.style.width = `${percentage}%`;
            
            // Cambiar color cuando queda poco tiempo
            if (this.modeTimer < 30) {
                timerBar.style.background = '#FF4444';
            } else if (this.modeTimer < 60) {
                timerBar.style.background = '#FFAA00';
            }
        }
    }
    
    onTimeUp() {
        console.log("⏰ ¡Tiempo agotado!");
        this.modeActive = false;
        
        if (this.currentMode === 'timeAttack') {
            // Verificar si ganó (distancia mínima)
            const targetDistance = 500; // 500m en 2 minutos
            if (this.game.distance >= targetDistance) {
                // Victoria
                this.showTimeAttackVictory();
            } else {
                // Derrota
                this.game.gameOver("TIEMPO AGOTADO");
            }
        }
    }
    
    showTimeAttackVictory() {
        const victoryScreen = document.createElement('div');
        victoryScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center;
        `;
        
        victoryScreen.innerHTML = `
            <div style="font-size: 4rem; margin-bottom: 20px;">🏆</div>
            <div style="font-size: 3rem; color: #00FF41; margin-bottom: 20px;">¡VICTORIA!</div>
            <div style="font-size: 1.5rem; margin-bottom: 30px;">Completaste el desafío contra reloj</div>
            <div style="background: rgba(0, 255, 65, 0.2); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <div>Distancia: ${Math.floor(this.game.distance)}m</div>
                <div>Tiempo: 2:00</div>
                <div>Puntuación: ${this.game.score}</div>
            </div>
            <button id="continue-button" style="
                padding: 15px 40px;
                font-size: 1.2rem;
                background: linear-gradient(135deg, #00FF41 0%, #008800 100%);
                border: none;
                border-radius: 8px;
                color: white;
                cursor: pointer;
                margin: 10px;
            ">CONTINUAR</button>
            <button id="restart-mode-button" style="
                padding: 15px 40px;
                font-size: 1.2rem;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid #00FF41;
                border-radius: 8px;
                color: white;
                cursor: pointer;
                margin: 10px;
            ">REINTENTAR</button>
        `;
        
        document.body.appendChild(victoryScreen);
        
        // Event listeners para botones
        document.getElementById('continue-button').addEventListener('click', () => {
            document.body.removeChild(victoryScreen);
            this.game.resetToMainMenu();
        });
        
        document.getElementById('restart-mode-button').addEventListener('click', () => {
            document.body.removeChild(victoryScreen);
            this.game.restartGame();
            this.setMode('timeAttack');
        });
    }
    
    setupReverseControls() {
        // Guardar controles originales
        const originalStrafe = this.game.player.strafe.bind(this.game.player);
        
        // Sobrescribir controles
        this.game.player.strafe = function(direction) {
            // Invertir dirección
            originalStrafe(-direction);
        };
        
        console.log("🔄 Controles invertidos activados");
    }
    
    setupNoGameOver() {
        // Desactivar game over por colisiones
        const originalCheckCollisions = this.game.checkCollisions.bind(this.game);
        
        this.game.checkCollisions = function() {
            // Solo verificar colisiones con monedas y power-ups
            // Ignorar colisiones con obstáculos
            
            if (this.isGameOver) return;
            
            const playerPosition = this.player.group.position;
            const playerRadius = 0.4;
            
            // Solo verificar monedas y power-ups
            // ... código similar pero sin obstáculos ...
        };
        
        console.log("🛡️ Modo sin game over activado");
    }
    
    setupRelaxingMusic() {
        // Cambiar música a algo más relajante
        if (this.game.sounds.background) {
            this.game.sounds.background.setVolume(0.2);
        }
    }
    
    update(deltaTime) {
        if (!this.modeActive || this.game.isPaused) return;
        
        // Actualizar timer en tiempo real (más preciso que setInterval)
        if (this.modes[this.currentMode].timeLimit) {
            this.modeTimer -= deltaTime;
            this.updateTimerUI();
            
            if (this.modeTimer <= 0) {
                this.modeTimer = 0;
                this.onTimeUp();
            }
        }
    }
    
    reset() {
        this.modeTimer = 0;
        this.modeActive = false;
        
        // Ocultar UI
        const modeInfo = document.getElementById('mode-info');
        if (modeInfo) {
            modeInfo.style.display = 'none';
        }
    }
}