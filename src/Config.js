// -----------------------------------------------------------------
// --- Config.js (CONFIGURACIÓN VR PRIMERA PERSONA - MEJORADA)
// -----------------------------------------------------------------

export const Config = {
    LANE_WIDTH: 4,

    PLAYER_START_Z: 0,
    CAMERA_START_Y: 6,
    CAMERA_START_Z: 15,
    
    CAMERA_FOV: 75,
    CAMERA_ASPECT: window.innerWidth / window.innerHeight,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,
    
    GAME_START_SPEED: 12,
    GAME_MAX_SPEED: 40,
    GAME_SPEED_INCREASE: 0.2,

    DIFFICULTY_INTERVAL: 1000,
    SPAWN_RATE_INCREASE: 0.3,

    JUMP_STRENGTH: 25,
    GRAVITY: -70,
    ROLL_DURATION: 0.7,
    
    PLAYER_STATE: {
        RUNNING: 'running',
        JUMPING: 'jumping',
        ROLLING: 'rolling',
        DEAD: 'dead'
    },

    OBSTACLE_TYPE: {
        BARRIER: 'barrier',
        WALL: 'wall',
        ROCK: 'rock',
        BARREL: 'barrel', 
        COIN: 'coin'
    },

    POWERUP_TYPE: {
        MAGNET: 'magnet',
        DOUBLE: 'double',
        SHIELD: 'shield',
        SLOWMO: 'slowmo'
    },

    POWERUP_DURATION: {
        magnet: 15.0,
        double: 15.0,
        shield: 10.0,
        slowmo: 8.0
    },

    POWERUP_SPAWN_CHANCE: 0.08,

    FOG_COLOR: 0x87CEEB,
    FOG_NEAR: 10,
    FOG_FAR: 300,

    SPAWN_Z: -150,
    DESPAWN_Z: 20,

    // NUEVO: Configuración VR PRIMERA PERSONA MEJORADA
    VR_SETTINGS: {
        PLAYER_HEIGHT: 1.6,
        GAZE_THRESHOLD: 0.3,
        GAZE_DURATION: 0.5,
        CAMERA_SMOOTHING: 0.1,
        GAZE_SELECT_TIME: 1.0 // Para look to select
    },

    // NUEVO: Configuración de colisiones mejoradas
    COLLISION_SETTINGS: {
        PLAYER_RADIUS: 0.4,
        PLAYER_HEIGHT: 1.8,
        COIN_RADIUS: 0.3,
        POWERUP_RADIUS: 0.5,
        OBSTACLE_PADDING: 0.2
    },

    // NUEVO: Modos de juego
    GAME_MODES: {
        CLASSIC: 'classic',
        TIME_ATTACK: 'timeAttack',
        ZEN_MODE: 'zenMode',
        MIRROR: 'mirror'
    },

    // NUEVO: Skybox paths
    SKYBOX_PATHS: [
        'Recursos/skybox/px.jpg',
        'Recursos/skybox/nx.jpg',
        'Recursos/skybox/py.jpg',
        'Recursos/skybox/ny.jpg',
        'Recursos/skybox/pz.jpg',
        'Recursos/skybox/nz.jpg'
    ]
};