// -----------------------------------------------------------------
// --- Game.js (VR PRIMERA PERSONA - CORREGIDO)
// -----------------------------------------------------------------

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { Config } from './Config.js';
import { Player } from './Player.js';
import { GameWorld } from './GameWorld.js';
import { ObstacleManager } from './ObstacleManager.js';
import { VRControls } from './VRControls.js';
import { VRAchievements } from './VRAchievements.js';
import { VRGameModes } from './VRGameModes.js';
import { VRLookSelector } from './VRLookSelector.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            Config.CAMERA_FOV,
            Config.CAMERA_ASPECT,
            Config.CAMERA_NEAR,
            Config.CAMERA_FAR
        );
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        this.clock = new THREE.Clock();
        
        this.player = null;
        this.world = null;
        this.obstacleManager = null;
        this.assets = {};

        // Configuración VR MEJORADA
        this.isVRMode = false;
        this.vrControls = null;
        this.vrLookSelector = null;
        this.cameraContainer = new THREE.Group();

        // NUEVO: Sistemas mejorados
        this.vrAchievements = new VRAchievements();
        this.vrGameModes = new VRGameModes(this);
        this.audioSystem = new AudioSystem();

        // SISTEMA DE AUDIO UNIFICADO
        this.audioListener = null;
        this.audioLoader = new THREE.AudioLoader();
        this.sounds = {
            background: null,
            coin: null,
            powerup: null,
            jump: null,
            gameover: null
        };

        this.isMusicPlaying = false;
        this.currentGameMode = Config.GAME_MODES.CLASSIC;

        this.isGameStarted = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.gameSpeed = Config.GAME_START_SPEED;
        this.score = 0;
        this.distance = 0;
        this.difficultyLevel = 1;
        this.gameTime = 0;

        // SISTEMA DE POWER-UPS MEJORADO
        this.activePowerUps = {
            magnet: { active: false, timer: 0, effect: null },
            double: { active: false, timer: 0, effect: null },
            shield: { active: false, timer: 0, effect: null },
            slowmo: { active: false, timer: 0, originalSpeed: 0 }
        };

        // NUEVO: Estadísticas
        this.stats = {
            coinsCollected: 0,
            powerUpsCollected: 0,
            jumps: 0,
            rolls: 0,
            distanceRecord: 0,
            timeInVR: 0,
            collisions: 0
        };

        this.ui = {
            score: document.getElementById('score'),
            distance: document.getElementById('distance'),
            gameOver: document.getElementById('game-over'),
            loadingScreen: document.getElementById('loading-screen'),
            loadingBar: document.getElementById('loading-bar'),
            loadingText: document.getElementById('loading-text'),
            errorScreen: document.getElementById('error-screen'),
            uiContainer: document.getElementById('ui-container'),
            modalOverlay: document.getElementById('modal-overlay'),
            rulesModal: document.getElementById('rules-modal'),
            vrIndicator: document.getElementById('vr-indicator')
        };

        this.powerUpIndicators = {
            magnet: document.createElement('div'),
            double: document.createElement('div'),
            shield: document.createElement('div'),
            slowmo: document.createElement('div')
        };

        this.setupPowerUpUI();
        
        // DEBUG mejorado
        this.frameCount = 0;
        this.collisionDebugEnabled = false; // Desactivado por defecto
        this.performanceStats = {
            fps: 0,
            lastFrameTime: performance.now(),
            drawCalls: 0
        };
    }

    async init() {
        console.log("Iniciando el juego con VR primera persona...");

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limitar pixel ratio
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // NUEVO: Configuración WebXR MEJORADA
        this.setupWebXR();

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        document.body.appendChild(this.renderer.domElement);

        // Configurar contenedor de cámara para VR
        this.setupCameraContainer();

        // NUEVO: Sistema de audio unificado
        await this.setupAudio();

        this.scene.fog = new THREE.Fog(Config.FOG_COLOR, Config.FOG_NEAR, Config.FOG_FAR);
        
        // POSICIÓN INICIAL MEJORADA
        this.cameraContainer.position.set(0, Config.VR_SETTINGS.PLAYER_HEIGHT, 0);
        this.camera.position.set(0, 0, 0);

        try {
            this.assets = await this.preloadAssets();
            this.ui.loadingScreen.style.display = 'none';
            console.log("Assets cargados, mostrando modal de reglas.");
            
            // Inicializar componentes después de cargar assets
            this.world = new GameWorld(this.scene, this.assets);
            this.player = new Player(this.scene, this.assets);
            this.obstacleManager = new ObstacleManager(this.scene, this.assets);

            // Configurar controles VR después de crear el player
            this.setupVRControls();

            // NUEVO: Configurar selector por mirada
            this.setupLookSelector();

            this.setupLights();
            await this.loadEnvironment('Recursos/sunset_jhbcentral_4k.hdr');

            // NUEVO: Iniciar modo de juego
            this.vrGameModes.setMode(Config.GAME_MODES.CLASSIC);

            window.addEventListener('resize', this.onWindowResize.bind(this), false);
            document.addEventListener('keydown', this.player.onKeyDown.bind(this.player), false);

            // NUEVO: Event listeners para stats
            this.setupEventListeners();

            console.log("Iniciación completa. VR primera persona configurada.");
            
            return Promise.resolve();
            
        } catch (error) {
            console.error("Error al inicializar el juego:", error);
            this.ui.loadingScreen.style.display = 'none';
            this.ui.errorScreen.style.display = 'flex';
            return Promise.reject(error);
        }
    }

    // NUEVO: Setup de event listeners
    setupEventListeners() {
        window.addEventListener('player-jump', () => {
            this.stats.jumps++;
            this.vrAchievements.checkAchievements(this.stats);
        });

        window.addEventListener('player-roll', () => {
            this.stats.rolls++;
            this.vrAchievements.checkAchievements(this.stats);
        });

        window.addEventListener('coin-collected', () => {
            this.stats.coinsCollected++;
            this.vrAchievements.checkAchievements(this.stats);
        });

        window.addEventListener('powerup-collected', () => {
            this.stats.powerUpsCollected++;
            this.vrAchievements.checkAchievements(this.stats);
        });

        window.addEventListener('collision', () => {
            this.stats.collisions++;
        });
    }

    setupCameraContainer() {
        this.scene.add(this.cameraContainer);
        this.cameraContainer.add(this.camera);
        console.log("✅ Contenedor de cámara VR configurado");
    }

    // NUEVO: Setup Look Selector
    setupLookSelector() {
        if (this.renderer.xr.enabled && this.player) {
            this.vrLookSelector = new VRLookSelector(this.camera, this.scene, this.player);
            console.log("✅ Selector por mirada configurado");
        }
    }

    // Configuración WebXR MEJORADA
    setupWebXR() {
        this.renderer.xr.enabled = true;
        
        const vrButton = VRButton.createButton(this.renderer);
        vrButton.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            background: rgba(0, 150, 255, 0.8);
            color: white;
            border: 2px solid white;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        `;
        document.body.appendChild(vrButton);
        
        this.renderer.xr.addEventListener('sessionstart', () => {
            console.log('🚀 Sesión VR iniciada - Primera persona activada');
            this.onVRStart();
        });
        
        this.renderer.xr.addEventListener('sessionend', () => {
            console.log('📴 Sesión VR finalizada');
            this.onVREnd();
        });
        
        console.log("✅ WebXR configurado - Primera persona inmersiva");
    }

    // Configurar controles VR MEJORADOS
    setupVRControls() {
        if (this.renderer.xr.enabled && this.player) {
            this.vrControls = new VRControls(this.camera, this.renderer, this.player, this.scene, this.cameraContainer);
            console.log("✅ Controles VR primera persona configurados");
        }
    }

    // Cuando inicia sesión VR - MEJORADO
    onVRStart() {
        this.isVRMode = true;
        this.player.enableVRMode();
        
        // Mostrar indicador VR
        if (this.ui.vrIndicator) {
            this.ui.vrIndicator.style.display = 'block';
        }
        
        // OCULTAR MODELO DEL JUGADOR EN VR
        if (this.player.group) {
            this.player.group.visible = false;
        }
        
        // Posicionar contenedor de cámara en el jugador
        const playerPos = this.player.group.position;
        this.cameraContainer.position.set(
            playerPos.x,
            Config.VR_SETTINGS.PLAYER_HEIGHT,
            playerPos.z
        );
        
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('game-vr-start'));
        
        console.log("🎮 Modo VR primera persona activado - Eres el personaje");
        
        // NUEVO: Logro por usar VR
        this.vrAchievements.unlock('firstVR');
    }

    // Cuando termina sesión VR - CORREGIDO
    onVREnd() {
        this.isVRMode = false;
        this.player.disableVRMode();
        
        // Ocultar indicador VR
        if (this.ui.vrIndicator) {
            this.ui.vrIndicator.style.display = 'none';
        }
        
        // MOSTRAR MODELO DEL JUGADOR en modo normal
        if (this.player.group) {
            this.player.group.visible = true;
        }
        
        // CORRECCIÓN: Posicionar cámara DETRÁS del jugador, no en (0,0,0)
        const playerPos = this.player.group.position;
        this.cameraContainer.position.set(
            playerPos.x, 
            Config.CAMERA_START_Y, 
            playerPos.z + Config.CAMERA_START_Z
        );
        this.cameraContainer.lookAt(playerPos);
        
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('game-vr-end'));
        
        console.log("🖥️ Modo VR desactivado - Volviendo a tercera persona");
    }

    // NUEVO: Sistema de audio unificado y mejorado
    async setupAudio() {
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);
        
        // Cargar todos los sonidos
        try {
            const soundsToLoad = {
                background: 'Recursos/Subway Surfers.mp3',
                coin: 'Recursos/SonidoMoneda.mp3',
                powerup: 'Recursos/SonidoMoneda.mp3', // Reusado temporalmente
                jump: 'Recursos/SonidoMoneda.mp3',    // Reusado temporalmente
                gameover: 'Recursos/SonidoMoneda.mp3' // Reusado temporalmente
            };

            for (const [key, path] of Object.entries(soundsToLoad)) {
                this.sounds[key] = new THREE.Audio(this.audioListener);
                const buffer = await new Promise((resolve, reject) => {
                    this.audioLoader.load(path, resolve, undefined, reject);
                });
                this.sounds[key].setBuffer(buffer);
                this.sounds[key].setLoop(key === 'background');
                
                // Volúmenes por defecto
                if (key === 'background') {
                    this.sounds[key].setVolume(0.3);
                } else {
                    this.sounds[key].setVolume(0.5);
                }
            }
            
            console.log("✅ Audio cargado correctamente");
            
        } catch (error) {
            console.warn("⚠️ Error cargando algunos sonidos:", error);
            // Crear sonidos placeholder si falla
            this.createPlaceholderSounds();
        }
    }

    createPlaceholderSounds() {
        // Crear sonidos simples como fallback
        const context = new (window.AudioContext || window.webkitAudioContext)();
        
        for (const key in this.sounds) {
            if (!this.sounds[key]) {
                this.sounds[key] = new THREE.Audio(this.audioListener);
                // Buffer simple de tono
                const buffer = context.createBuffer(1, 22050, 22050);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < 22050; i++) {
                    data[i] = Math.sin(i * 0.01) * 0.1;
                }
                this.sounds[key].setBuffer(buffer);
                this.sounds[key].setVolume(0.1);
            }
        }
    }

    playSound(soundName) {
        if (this.sounds[soundName] && !this.isPaused) {
            this.sounds[soundName].stop();
            this.sounds[soundName].play();
            return true;
        }
        return false;
    }

    playBackgroundMusic() {
        if (this.sounds.background && !this.isMusicPlaying) {
            this.sounds.background.play();
            this.isMusicPlaying = true;
            console.log("Música de fondo iniciada");
        }
    }

    pauseBackgroundMusic() {
        if (this.sounds.background && this.isMusicPlaying) {
            this.sounds.background.pause();
            this.isMusicPlaying = false;
            console.log("Música de fondo pausada");
        }
    }

    stopBackgroundMusic() {
        if (this.sounds.background) {
            this.sounds.background.stop();
            this.isMusicPlaying = false;
            console.log("Música de fondo detenida");
        }
    }

    setupPowerUpUI() {
        const powerUpContainer = document.getElementById('powerup-container') || document.createElement('div');
        powerUpContainer.id = 'powerup-container';
        powerUpContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 100;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        const powerUpConfigs = {
            magnet: { color: '#FF0000', text: '🎯 IMÁN', icon: '🧲' },
            double: { color: '#FFFF00', text: '🔧 DOBLE', icon: '⚡' },
            shield: { color: '#00FF00', text: '🛡️ ESCUDO', icon: '🛡️' },
            slowmo: { color: '#00FFFF', text: '🐌 CÁMARA LENTA', icon: '⏱️' }
        };

        for (const [type, config] of Object.entries(powerUpConfigs)) {
            this.powerUpIndicators[type].id = `${type}-indicator`;
            this.powerUpIndicators[type].style.cssText = `
                background: rgba(${this.hexToRgb(config.color)}, 0.3);
                border: 2px solid ${config.color};
                border-radius: 10px;
                padding: 10px;
                color: white;
                font-weight: bold;
                min-width: 160px;
                text-align: center;
                display: none;
                transition: all 0.3s ease;
                font-size: 14px;
                box-shadow: 0 0 10px ${config.color}80;
            `;
            this.powerUpIndicators[type].innerHTML = `
                ${config.icon} ${config.text}: <span class="timer">0.0s</span>
            `;
            powerUpContainer.appendChild(this.powerUpIndicators[type]);
        }

        if (!document.getElementById('powerup-container')) {
            document.body.appendChild(powerUpContainer);
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '255, 255, 255';
    }

    activatePowerUp(type) {
        console.log(`🎯 ACTIVANDO POWER-UP: ${type}`);
        
        const duration = Config.POWERUP_DURATION[type];
        
        this.activePowerUps[type].active = true;
        this.activePowerUps[type].timer = duration;
        
        // Efectos especiales
        switch(type) {
            case 'shield':
                this.activePowerUps.shield.effect = this.createShieldEffect();
                break;
            case 'slowmo':
                this.activePowerUps.slowmo.originalSpeed = this.gameSpeed;
                this.gameSpeed = this.gameSpeed * 0.5;
                break;
        }
        
        this.powerUpIndicators[type].style.display = 'block';
        this.powerUpIndicators[type].style.background = `rgba(${this.hexToRgb(
            type === 'magnet' ? '#FF0000' : 
            type === 'double' ? '#FFFF00' : 
            type === 'shield' ? '#00FF00' : '#00FFFF'
        )}, 0.7)`;
        
        this.playSound('powerup');
        this.showPowerUpNotification(type);
        
        // Evento para estadísticas
        window.dispatchEvent(new CustomEvent('powerup-activated', { detail: { type } }));
        
        console.log(`✅ Power-up ACTIVADO: ${type} por ${duration}s`);
    }

    createShieldEffect() {
        const geometry = new THREE.SphereGeometry(1.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00FF00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const shield = new THREE.Mesh(geometry, material);
        this.player.group.add(shield);
        return shield;
    }

    updatePowerUps(deltaTime) {
        for (const [type, powerUp] of Object.entries(this.activePowerUps)) {
            if (powerUp.active) {
                powerUp.timer -= deltaTime;
                
                const indicator = this.powerUpIndicators[type];
                const timerElement = indicator.querySelector('.timer');
                if (timerElement) {
                    timerElement.textContent = `${Math.max(0, powerUp.timer).toFixed(1)}s`;
                }
                
                // Efecto de parpadeo cuando queda poco tiempo
                if (powerUp.timer < 3.0) {
                    const blink = (Math.sin(Date.now() * 0.02) + 1) * 0.3 + 0.4;
                    indicator.style.opacity = blink;
                    
                    // Parpadeo del efecto visual si existe
                    if (powerUp.effect && powerUp.effect.material) {
                        powerUp.effect.material.opacity = blink * 0.3;
                    }
                }
                
                // Desactivar cuando timer llega a 0
                if (powerUp.timer <= 0) {
                    console.log(`⏰ Power-up ${type} terminó - Desactivando`);
                    this.deactivatePowerUp(type);
                }
            }
        }
    }

    deactivatePowerUp(type) {
        console.log(`🔚 DESACTIVANDO POWER-UP: ${type}`);
        
        this.activePowerUps[type].active = false;
        this.activePowerUps[type].timer = 0;
        
        // Remover efectos visuales
        if (type === 'shield' && this.activePowerUps.shield.effect) {
            this.player.group.remove(this.activePowerUps.shield.effect);
            this.activePowerUps.shield.effect.geometry.dispose();
            this.activePowerUps.shield.effect.material.dispose();
            this.activePowerUps.shield.effect = null;
        }
        
        if (type === 'slowmo') {
            this.gameSpeed = this.activePowerUps.slowmo.originalSpeed || Config.GAME_START_SPEED;
        }
        
        this.powerUpIndicators[type].style.display = 'none';
        this.powerUpIndicators[type].style.opacity = '1';
        
        console.log(`❌ Power-up DESACTIVADO: ${type}`);
    }

    showPowerUpNotification(type) {
        const notification = document.createElement('div');
        const powerUpInfo = {
            magnet: { text: '🎯 IMÁN ACTIVADO!', color: '#FF0000', subtext: 'Atrae monedas automáticamente' },
            double: { text: '🔧 DOBLE PUNTUACIÓN!', color: '#FFFF00', subtext: 'Monedas valen 20 puntos' },
            shield: { text: '🛡️ ESCUDO ACTIVADO!', color: '#00FF00', subtext: 'Inmune a obstáculos por 10s' },
            slowmo: { text: '🐌 CÁMARA LENTA!', color: '#00FFFF', subtext: 'El tiempo se ralentiza' }
        };
        
        const info = powerUpInfo[type];
        
        notification.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${info.color}DD;
            color: white;
            padding: 25px 50px;
            border-radius: 15px;
            font-size: 28px;
            font-weight: bold;
            z-index: 1000;
            animation: powerUpNotification 3s ease-in-out;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            text-align: center;
            border: 3px solid white;
            box-shadow: 0 0 30px ${info.color};
        `;
        
        notification.innerHTML = `
            <div style="margin-bottom: 10px;">${info.text}</div>
            <div style="font-size: 18px; opacity: 0.9;">${info.subtext}</div>
            <div style="font-size: 16px; opacity: 0.7; margin-top: 5px;">
                ${Config.POWERUP_DURATION[type]} segundos
            </div>
        `;
        
        // Añadir estilo de animación si no existe
        if (!document.getElementById('powerup-notification-style')) {
            const style = document.createElement('style');
            style.id = 'powerup-notification-style';
            style.textContent = `
                @keyframes powerUpNotification {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
                    15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                    25% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    75% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    85% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    resetToMainMenu() {
        console.log("🔄 Reiniciando a menú principal...");
        
        this.stopBackgroundMusic();
        
        this.isGameStarted = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = Config.GAME_START_SPEED;
        this.difficultyLevel = 1;
        this.gameTime = 0;
        
        // Desactivar TODOS los power-ups y limpiar efectos
        for (const type in this.activePowerUps) {
            this.deactivatePowerUp(type);
        }
        
        if (this.obstacleManager) {
            this.obstacleManager.reset();
        }
        
        if (this.player) this.player.reset();
        if (this.world) this.world.reset();
        
        this.ui.uiContainer.style.display = 'none';
        this.ui.gameOver.style.display = 'none';
        document.getElementById('pause-button').style.display = 'none';
        document.getElementById('pause-menu').style.display = 'none';
        
        this.ui.modalOverlay.style.display = 'flex';
        this.ui.rulesModal.style.display = 'block';

        // Reiniciar música de intro (HTML5 para menú)
        const introMusic = document.getElementById('intro-music');
        if (introMusic) {
            introMusic.currentTime = 0;
            if (!introMusic.muted) {
                introMusic.play().catch(e => console.log('Error al reanudar música:', e));
            }
        }
        
        console.log("✅ Menú principal cargado correctamente");
    }

    startGame() {
        this.clock.start();
        console.log("🚀 INICIANDO JUEGO - VR Primera Persona");
        
        this.checkInitialCollisions();
        
        this.ui.modalOverlay.style.display = 'none';
        this.ui.rulesModal.style.display = 'none';
        this.ui.uiContainer.style.display = 'block';

        this.isGameStarted = true;
        this.isGameOver = false;
        
        this.playBackgroundMusic();
        this.resetGameLogic();
        this.animate();
    }

    checkInitialCollisions() {
        if (!this.collisionDebugEnabled) return;
        
        console.log("🔍 VERIFICANDO COLISIONES INICIALES...");
        
        const playerBox = this.player.getBoundingBox();
        console.log("📍 Posición inicial del jugador:", {
            x: this.player.group.position.x.toFixed(2),
            y: this.player.group.position.y.toFixed(2), 
            z: this.player.group.position.z.toFixed(2)
        });

        console.log(`🎯 Obstáculos al inicio: ${this.obstacleManager.obstacles.length}`);
        this.obstacleManager.obstacles.forEach((obstacle, i) => {
            const obstacleBox = obstacle.getBoundingBox();
            console.log(`   Obstáculo ${i}:`, {
                type: obstacle.type,
                position: {
                    x: obstacle.mesh.position.x.toFixed(2),
                    y: obstacle.mesh.position.y.toFixed(2),
                    z: obstacle.mesh.position.z.toFixed(2)
                },
                colisiona: playerBox.intersectsBox(obstacleBox)
            });
        });
    }

    resetGameLogic() {
        console.log("🔄 Reseteando juego...");
        
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = Config.GAME_START_SPEED;
        this.difficultyLevel = 1;
        this.gameTime = 0;

        // Resetear estadísticas
        this.stats = {
            coinsCollected: 0,
            powerUpsCollected: 0,
            jumps: 0,
            rolls: 0,
            distanceRecord: 0,
            timeInVR: 0,
            collisions: 0
        };

        for (const type in this.activePowerUps) {
            this.activePowerUps[type].active = false;
            this.activePowerUps[type].timer = 0;
            this.powerUpIndicators[type].style.display = 'none';
        }

        this.ui.score.textContent = `Puntos: 0`;
        this.ui.distance.textContent = `Distancia: 0m`;

        if (this.obstacleManager) {
            this.obstacleManager.reset();
        }
        
        if (this.player) this.player.reset();
        if (this.world) this.world.reset();

        console.log("✅ Juego reiniciado - Listo para empezar");
    }

    restartGame() {
        this.clock.start();
        console.log("Reiniciando el juego...");
        
        this.ui.gameOver.style.display = 'none';
        this.isGameOver = false;
        
        this.playBackgroundMusic();
        this.resetGameLogic();
        this.animate();
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.bias = -0.001;
        this.scene.add(dirLight);
    }

    async loadEnvironment(hdrPath) {
        try {
            const rgbeLoader = new RGBELoader();
            const texture = await new Promise((resolve, reject) => {
                rgbeLoader.load(hdrPath, resolve, undefined, reject);
            });
            
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.background = texture;
            this.scene.environment = texture;
            console.log("✅ Fondo HDR cargado.");
            
        } catch (err) {
            console.warn("⚠️ No se pudo cargar el fondo HDR. Usando skybox.", err);
            
            // Intentar cargar skybox como fallback
            try {
                const cubeTextureLoader = new THREE.CubeTextureLoader();
                const skybox = cubeTextureLoader.load(Config.SKYBOX_PATHS);
                this.scene.background = skybox;
                this.scene.environment = skybox;
                console.log("✅ Skybox cargado como fallback.");
            } catch (skyboxErr) {
                console.warn("⚠️ No se pudo cargar skybox. Usando color sólido.", skyboxErr);
                this.scene.background = new THREE.Color(0x87CEEB);
            }
        }
    }

    updateDifficulty() {
        const newDifficulty = Math.floor(this.distance / Config.DIFFICULTY_INTERVAL) + 1;
        
        if (newDifficulty > this.difficultyLevel) {
            this.difficultyLevel = newDifficulty;
            
            const speedIncrease = 2 * this.difficultyLevel;
            this.gameSpeed = Math.min(
                Config.GAME_START_SPEED + speedIncrease, 
                Config.GAME_MAX_SPEED
            );
            
            this.obstacleManager.baseSpawnRate = Math.max(
                0.5, 
                2 - (this.difficultyLevel * 0.3)
            );
            
            console.log(`¡Dificultad Nivel ${this.difficultyLevel}! Velocidad: ${this.gameSpeed.toFixed(1)}`);
            
            // Logro por alcanzar nivel de dificultad
            if (this.difficultyLevel >= 5) {
                this.vrAchievements.unlock('difficulty5');
            }
        }
    }

    preloadAssets() {
        console.log("Precargando assets...");
        const fbxLoader = new FBXLoader();
        const textureLoader = new THREE.TextureLoader();
        const totalAssets = 15; 
        let loadedCount = 0;

        const updateProgress = () => {
            loadedCount++;
            const progress = (loadedCount / totalAssets) * 100;
            this.ui.loadingBar.style.width = `${progress}%`;
            this.ui.loadingText.textContent = `${Math.round(progress)}%`;
            console.log(`Progreso de carga: ${progress}%`);
        };

        const loadPromise = (path) => {
            return new Promise((resolve, reject) => {
                fbxLoader.load(path, (obj) => {
                    updateProgress();
                    resolve(obj);
                }, undefined, (err) => {
                    console.error(`Error cargando ${path}`, err);
                    reject(err);
                });
            });
        };

        const loadTexturePromise = (path) => {
            return new Promise((resolve, reject) => {
                textureLoader.load(path, (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    resolve(texture);
                }, undefined, (err) => {
                    console.error(`Error cargando textura ${path}`, err);
                    reject(err);
                });
            });
        };

        return new Promise(async (resolve, reject) => {
            try {
                const assetPaths = {
                    coin: 'Recursos/Low Poly Coin.fbx',
                    barrier: 'Recursos/concrete_road_barrier4k.fbx',
                    car: 'Recursos/covered_car4k.fbx',
                    rock: 'Recursos/moon_rock_4k.fbx',
                    barrel: 'Recursos/Barrel.fbx',
                    dartboard: 'Recursos/dartboard_4k.fbx', 
                    pipeWrench: 'Recursos/pipe_wrench_4k.fbx', 
                    playerModel: 'Recursos/character.fbx',
                    animRun: 'Recursos/Fast Run.fbx',
                    animJump: 'Recursos/Jump.fbx',
                    animDie: 'Recursos/Death.fbx',
                    animRoll: 'Recursos/Sprinting Forward Roll.fbx',
                    animLeft: 'Recursos/Left.fbx',   
                    animRight: 'Recursos/Right.fbx',
                    zombieModel: 'Recursos/Zombie Walk1.fbx'
                };

                console.log("Cargando texturas...");
                const [
                    carTexture,
                    barrierDiffTexture,
                    barrierDispTexture,
                    rockDiffTexture,
                    rockDispTexture,
                    barrelTexture, 
                    dartboardTexture, 
                    pipeWrenchTexture 
                ] = await Promise.all([
                    loadTexturePromise('Recursos/covered_car_diff_4k.jpg'),
                    loadTexturePromise('Recursos/concrete_road_barrier_diff_4k.jpg'),
                    loadTexturePromise('Recursos/concrete_road_barrier_disp_4k.png'),
                    loadTexturePromise('Recursos/moon_rock_03_diff_4k.jpg'),
                    loadTexturePromise('Recursos/moon_rock_03_disp_4k.png'),
                    loadTexturePromise('Recursos/Barrel_01.png'), 
                    loadTexturePromise('Recursos/dartboard_diff_4k.jpg'), 
                    loadTexturePromise('Recursos/pipe_wrench_diff_4k.jpg') 
                ]);

                const [
                    coin, 
                    barrier, 
                    car, 
                    rock,
                    barrel, 
                    dartboard,
                    pipeWrench, 
                    playerModel,
                    animRun,
                    animJump,
                    animDie,
                    animRoll,
                    animLeft,
                    animRight,
                    zombieModel
                    
                ] = await Promise.all([
                    loadPromise(assetPaths.coin),
                    loadPromise(assetPaths.barrier),
                    loadPromise(assetPaths.car),
                    loadPromise(assetPaths.rock),
                    loadPromise(assetPaths.barrel),
                    loadPromise(assetPaths.dartboard), 
                    loadPromise(assetPaths.pipeWrench), 
                    loadPromise(assetPaths.playerModel),
                    loadPromise(assetPaths.animRun),
                    loadPromise(assetPaths.animJump),
                    loadPromise(assetPaths.animDie),
                    loadPromise(assetPaths.animRoll),
                    loadPromise(assetPaths.animLeft),
                    loadPromise(assetPaths.animRight),
                    loadPromise(assetPaths.zombieModel)
                ]);

                // Aplicar texturas
                const applyTexture = (model, texture, displacement = null) => {
                    model.traverse(child => {
                        if (child.isMesh && child.material) {
                            child.material.map = texture;
                            if (displacement) {
                                child.material.displacementMap = displacement;
                                child.material.displacementScale = displacement === barrierDispTexture ? 0.1 : 0.05;
                            }
                            child.material.needsUpdate = true;
                        }
                    });
                };

                applyTexture(car, carTexture);
                applyTexture(barrier, barrierDiffTexture, barrierDispTexture);
                applyTexture(rock, rockDiffTexture, rockDispTexture);
                applyTexture(barrel, barrelTexture);
                applyTexture(dartboard, dartboardTexture);
                applyTexture(pipeWrench, pipeWrenchTexture);

                // Escalas
                coin.scale.set(0.005, 0.005, 0.005);           
                barrier.scale.set(0.01, 0.01, 0.01);           
                car.scale.set(0.015, 0.015, 0.015);            
                barrel.scale.set(0.02, 0.02, 0.02);            
                dartboard.scale.set(0.03, 0.03, 0.03);    
                pipeWrench.scale.set(0.03, 0.03, 0.03); 
                zombieModel.scale.set(0.011, 0.011, 0.011);

                // Configurar sombras
                [coin, barrier, car, rock, barrel, dartboard, pipeWrench, playerModel].forEach(model => {
                    model.traverse(child => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                });

                console.log("✅ Todos los assets cargados y configurados");

                resolve({
                    coin: coin,
                    playerModel: playerModel,
                    barrier: barrier,
                    car: car,
                    rock: rock,
                    barrel: barrel, 
                    dartboard: dartboard, 
                    pipeWrench: pipeWrench, 
                    obstacleBarriers: [barrier, car, rock, barrel], 
                    animRun: animRun,
                    animJump: animJump,
                    animDie: animDie,
                    animRoll: animRoll,
                    animLeft: animLeft,
                    animRight: animRight,
                    zombieModel: zombieModel
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    // NUEVO: Sistema de colisiones mejorado
    checkCollisions() {
        if (this.isGameOver || this.activePowerUps.shield.active) return;

        const playerPosition = this.player.group.position;
        const playerRadius = Config.COLLISION_SETTINGS.PLAYER_RADIUS;

        this.frameCount++;

        // Debug cada 120 frames
        if (this.collisionDebugEnabled && this.frameCount % 120 === 0) {
            console.log(`🔄 Frame ${this.frameCount} - Distancia: ${this.distance.toFixed(0)}m`);
            console.log(`📍 Jugador: X=${playerPosition.x.toFixed(2)}, Z=${playerPosition.z.toFixed(2)}`);
            console.log(`🎯 Obstáculos: ${this.obstacleManager.obstacles.length}`);
            console.log(`⚡ Power-ups: ${this.obstacleManager.powerUps.length}`);
        }

        // Colisiones con obstáculos
        for (let i = 0; i < this.obstacleManager.obstacles.length; i++) {
            const obstacle = this.obstacleManager.obstacles[i];
            const obstaclePos = obstacle.mesh.position;
            
            // Distancia simple (mejor que Box3 para objetos redondeados)
            const distance = Math.sqrt(
                Math.pow(playerPosition.x - obstaclePos.x, 2) +
                Math.pow(playerPosition.z - obstaclePos.z, 2)
            );
            
            const collisionDistance = playerRadius + Config.COLLISION_SETTINGS.OBSTACLE_PADDING;
            
            if (distance < collisionDistance && 
                Math.abs(playerPosition.y - obstaclePos.y) < 2) {
                
                console.log("🚨 ¡COLISIÓN CON OBSTÁCULO! Game Over");
                window.dispatchEvent(new CustomEvent('collision'));
                this.gameOver("COLISIÓN CON OBSTÁCULO");
                return;
            }
        }

        // Colisiones con monedas
        for (let i = this.obstacleManager.coins.length - 1; i >= 0; i--) {
            const coin = this.obstacleManager.coins[i];
            const coinPos = coin.mesh.position;
            
            const distance = Math.sqrt(
                Math.pow(playerPosition.x - coinPos.x, 2) +
                Math.pow(playerPosition.z - coinPos.z, 2)
            );
            
            if (distance < (playerRadius + Config.COLLISION_SETTINGS.COIN_RADIUS)) {
                console.log("💰 Moneda recolectada!");
                this.obstacleManager.collectCoin(coin);
                
                let points = 10;
                if (this.activePowerUps.double.active) {
                    points = 20;
                    console.log("✅ Bonus doble aplicado: +20 puntos");
                }
                
                this.score += points;
                this.ui.score.textContent = `Puntos: ${this.score}`;
                
                this.playSound('coin');
                window.dispatchEvent(new CustomEvent('coin-collected'));
            }
        }

        // Colisiones con power-ups
        for (let i = this.obstacleManager.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.obstacleManager.powerUps[i];
            const powerUpPos = powerUp.mesh.position;
            
            const distance = Math.sqrt(
                Math.pow(playerPosition.x - powerUpPos.x, 2) +
                Math.pow(playerPosition.z - powerUpPos.z, 2)
            );
            
            if (distance < (playerRadius + Config.COLLISION_SETTINGS.POWERUP_RADIUS)) {
                console.log(`⚡ ¡COLISIÓN CON POWER-UP! Tipo: ${powerUp.powerUpType}`);
                
                this.obstacleManager.collectPowerUp(powerUp);
                
                if (powerUp.powerUpType && this.activePowerUps.hasOwnProperty(powerUp.powerUpType)) {
                    console.log(`🎯 Activando power-up: ${powerUp.powerUpType}`);
                    this.activatePowerUp(powerUp.powerUpType);
                } else {
                    console.error("❌ Tipo de power-up inválido:", powerUp.powerUpType);
                }
                break;
            }
        }
    }
    
    gameOver(reason = "DESCONOCIDO") {
        if (this.isGameOver) return;

        console.log("🛑 ================================");
        console.log("🛑 GAME OVER - INICIANDO SECUENCIA");
        console.log(`🛑 Razón: ${reason}`);
        console.log(`🛑 Distancia: ${this.distance.toFixed(0)}m`);
        console.log(`🛑 Puntuación: ${this.score}`);
        console.log("🛑 ================================");

        this.isGameOver = true;
        this.pauseBackgroundMusic();
        this.playSound('gameover');

        // Actualizar estadísticas
        this.stats.distanceRecord = Math.max(this.stats.distanceRecord, this.distance);

        if (this.player) {
            this.player.die();
        }

        if (this.player && this.player.mixer) {
            const dieAction = this.player.actions.die;

            const onDieAnimationFinished = (e) => {
                if (e.action === dieAction) {
                    console.log("Animación 'die' terminada. Mostrando menú de Game Over.");

                    // Actualizar UI con estadísticas
                    document.getElementById('final-score').textContent = this.score;
                    document.getElementById('final-distance').textContent = Math.floor(this.distance) + 'm';
                    document.getElementById('final-coins').textContent = this.stats.coinsCollected;
                    document.getElementById('final-time').textContent = Math.floor(this.gameTime) + 's';

                    this.ui.gameOver.style.display = 'block';

                    this.player.mixer.removeEventListener('finished', onDieAnimationFinished);
                }
            };

            this.player.mixer.addEventListener('finished', onDieAnimationFinished);

        } else {
            this.ui.gameOver.style.display = 'block';
        }

        // Verificar logros
        this.vrAchievements.checkAchievements(this.stats);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        if (!this.isGameStarted) {
            return;
        }

        if (this.renderer.xr.isPresenting) {
            this.renderer.setAnimationLoop(this.render.bind(this));
        } else {
            requestAnimationFrame(this.animate.bind(this));
            this.render();
        }
    }

    // NUEVO: Actualizar estadísticas de rendimiento
    updatePerformanceStats() {
        const now = performance.now();
        this.performanceStats.fps = Math.round(1000 / (now - this.performanceStats.lastFrameTime));
        this.performanceStats.lastFrameTime = now;
        this.performanceStats.drawCalls = this.renderer.info.render.calls;
    }

    // Render MEJORADO para VR primera persona
    render() {
        if (this.isPaused) {
            return; 
        }

        const delta = this.clock.getDelta();
        this.gameTime += delta;

        // NUEVO: Actualizar estadísticas de tiempo en VR
        if (this.isVRMode) {
            this.stats.timeInVR += delta;
        }

        // Actualizar estadísticas de rendimiento
        this.updatePerformanceStats();

        // NUEVO: Actualizar selector por mirada
        if (this.vrLookSelector && this.isVRMode) {
            this.vrLookSelector.update(delta);
        }

        // Actualizar controles VR
        if (this.vrControls && this.isVRMode) {
            this.vrControls.update(delta);
        }

        if (this.player) {
            this.player.update(delta);
            
            // En VR primera persona, la cámara SIGUE al jugador
            if (this.isVRMode) {
                this.cameraContainer.position.x = this.player.group.position.x;
                this.cameraContainer.position.z = this.player.group.position.z;
                
                // Ajustar altura durante saltos
                if (this.player.state === Config.PLAYER_STATE.JUMPING) {
                    this.cameraContainer.position.y = Config.VR_SETTINGS.PLAYER_HEIGHT + this.player.group.position.y;
                } else {
                    this.cameraContainer.position.y = Config.VR_SETTINGS.PLAYER_HEIGHT;
                }
            }
        }

        if (this.isGameOver) {
            if (this.world) {
                this.world.zombieCatch(delta);
            }
            this.renderer.render(this.scene, this.camera);
            return;
        }

        const playerPosition = this.player.group.position;

        this.world.update(delta, this.gameSpeed, playerPosition);
        
        this.obstacleManager.update(
            delta, 
            this.gameSpeed, 
            this.distance, 
            playerPosition,
            this.activePowerUps
        );

        // En modo normal, cámara sigue al jugador en 3ra persona
        if (!this.isVRMode) {
            this.cameraContainer.position.z = playerPosition.z + Config.CAMERA_START_Z;
            this.cameraContainer.position.x = playerPosition.x;
            this.cameraContainer.lookAt(playerPosition.x, playerPosition.y, playerPosition.z);
        }

        this.distance += this.gameSpeed * delta;
        this.ui.distance.textContent = `Distancia: ${this.distance.toFixed(0)}m`;
        
        this.updatePowerUps(delta);
        this.updateDifficulty();
        
        this.checkCollisions();

        this.renderer.render(this.scene, this.camera);
    }
}

// Clase auxiliar para sistema de audio
class AudioSystem {
    constructor() {
        this.masterVolume = 1.0;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }
    
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
}