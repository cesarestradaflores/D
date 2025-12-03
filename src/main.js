// -----------------------------------------------------------------
// --- main.js (Punto de Entrada - Actualizado)
// -----------------------------------------------------------------
import { Game } from './Game.js';

// Hacer la instancia del juego global para acceder desde los controles de audio
window.game = null;

document.addEventListener('DOMContentLoaded', () => {
    
    window.game = new Game();
    
    const startButton = document.getElementById('start-game-button');
    const restartButton = document.getElementById('restart-button');
    const modeSelector = document.getElementById('mode-selector');

    if (!startButton || !restartButton) {
        console.error("No se pudieron encontrar los botones de inicio o reinicio.");
        return;
    }

    startButton.addEventListener('click', () => {
        console.log("Botón de inicio presionado.");
        
        // Aplicar modo seleccionado si existe
        if (modeSelector && window.game.vrGameModes) {
            window.game.vrGameModes.setMode(modeSelector.value);
        }
        
        window.game.startGame();
    });

    restartButton.addEventListener('click', () => {
        console.log("Botón de reinicio presionado.");
        window.game.restartGame();
    });
    
    // NUEVO: Selector de modo de juego
    if (modeSelector) {
        modeSelector.addEventListener('change', function() {
            const modeDetails = document.getElementById('mode-details');
            if (modeDetails && window.game && window.game.vrGameModes) {
                const mode = window.game.vrGameModes.modes[this.value];
                if (mode) {
                    modeDetails.textContent = mode.description;
                }
            }
        });
    }
    
    window.game.init().catch(err => {
        console.error("Error al inicializar el juego:", err);
        const loadingScreen = document.getElementById('loading-screen');
        const errorScreen = document.getElementById('error-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (errorScreen) errorScreen.style.display = 'flex';
    });

});