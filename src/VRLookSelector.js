// -----------------------------------------------------------------
// --- VRLookSelector.js (LOOK TO SELECT - Documentación WebXR)
// -----------------------------------------------------------------

import * as THREE from 'three';
import { Config } from './Config.js';

export class VRLookSelector {
    constructor(camera, scene, player) {
        this.camera = camera;
        this.scene = scene;
        this.player = player;
        
        this.raycaster = new THREE.Raycaster();
        this.selectedObject = null;
        this.selectionTimer = 0;
        this.selectionTimeRequired = Config.VR_SETTINGS.GAZE_SELECT_TIME;
        this.isSelecting = false;
        
        // Crear cursor visual (como en ejemplo webxr-look-to-select-w-cursor.html)
        this.cursor = this.createCursor();
        scene.add(this.cursor);
        
        // Lista de objetos seleccionables
        this.selectableObjects = [];
        
        console.log("✅ Look Selector VR inicializado");
    }
    
    createCursor() {
        // Similar a: https://threejs.org/manual/examples/webxr-look-to-select-w-cursor.html
        const geometry = new THREE.RingGeometry(0.02, 0.04, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        
        const cursor = new THREE.Mesh(geometry, material);
        cursor.position.z = -2;
        cursor.visible = false;
        
        // Añadir punto central
        const dotGeometry = new THREE.CircleGeometry(0.005, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        cursor.add(dot);
        
        return cursor;
    }
    
    registerSelectableObject(object, onSelectCallback) {
        if (!object.userData) {
            object.userData = {};
        }
        
        object.userData.selectable = true;
        object.userData.onSelect = onSelectCallback;
        object.userData.highlightMaterial = null;
        
        this.selectableObjects.push(object);
        
        console.log(`✅ Objeto registrado como seleccionable:`, object);
    }
    
    update(deltaTime) {
        if (!this.camera.parent) return;
        
        // Configurar raycaster desde el centro de la cámara
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        
        // Filtrar solo objetos seleccionables
        const selectableObjects = this.selectableObjects.filter(obj => obj.visible);
        const intersects = this.raycaster.intersectObjects(selectableObjects);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            
            // Mostrar cursor en el punto de intersección
            this.cursor.visible = true;
            this.cursor.position.copy(intersect.point);
            
            // Hacer que el cursor mire hacia la cámara
            this.cursor.lookAt(this.camera.position);
            
            // Si es un objeto nuevo, reiniciar timer
            if (this.selectedObject !== intersect.object) {
                this.selectedObject = intersect.object;
                this.selectionTimer = 0;
                this.isSelecting = true;
                
                // Resaltar objeto
                this.highlightObject(intersect.object, true);
                
                console.log(`👁️ Mirando objeto:`, intersect.object);
            }
            
            // Incrementar timer de selección
            this.selectionTimer += deltaTime;
            
            // Actualizar visual del cursor (anillo que se llena)
            const progress = this.selectionTimer / this.selectionTimeRequired;
            this.updateCursorProgress(progress);
            
            // Si se alcanzó el tiempo requerido, seleccionar
            if (this.selectionTimer >= this.selectionTimeRequired && !intersect.object.userData.selected) {
                this.onObjectSelected(intersect.object);
            }
            
        } else {
            // No hay objetos bajo la mirada
            this.cursor.visible = false;
            
            // Si estaba seleccionando un objeto, des-resaltarlo
            if (this.selectedObject && this.isSelecting) {
                this.highlightObject(this.selectedObject, false);
                this.isSelecting = false;
            }
            
            this.selectedObject = null;
            this.selectionTimer = 0;
            this.resetCursor();
        }
    }
    
    updateCursorProgress(progress) {
        // Animar el cursor para mostrar progreso
        const ring = this.cursor.children[0];
        if (ring && ring.material) {
            // Cambiar color basado en progreso
            if (progress < 0.33) {
                ring.material.color.setHex(0xff0000); // Rojo
            } else if (progress < 0.66) {
                ring.material.color.setHex(0xffaa00); // Naranja
            } else {
                ring.material.color.setHex(0x00ff00); // Verde
            }
            
            // Escalar el anillo interno para mostrar progreso
            const scale = 0.02 + (0.02 * progress);
            this.cursor.scale.set(1 + progress * 0.5, 1 + progress * 0.5, 1);
        }
    }
    
    resetCursor() {
        this.cursor.scale.set(1, 1, 1);
        const ring = this.cursor.children[0];
        if (ring && ring.material) {
            ring.material.color.setHex(0x00ff00);
        }
    }
    
    highlightObject(object, highlight) {
        if (!object || !object.isMesh) return;
        
        if (highlight) {
            // Guardar material original
            if (!object.userData.originalMaterial) {
                object.userData.originalMaterial = object.material;
            }
            
            // Crear material resaltado
            const highlightMaterial = object.material.clone();
            highlightMaterial.emissive = new THREE.Color(0x00ff00);
            highlightMaterial.emissiveIntensity = 0.3;
            
            object.material = highlightMaterial;
            object.userData.highlightMaterial = highlightMaterial;
            
        } else if (object.userData.originalMaterial) {
            // Restaurar material original
            object.material = object.userData.originalMaterial;
            
            // Limpiar material resaltado si existe
            if (object.userData.highlightMaterial) {
                object.userData.highlightMaterial.dispose();
                object.userData.highlightMaterial = null;
            }
        }
    }
    
    onObjectSelected(object) {
        if (!object || !object.userData) return;
        
        console.log(`🎯 Objeto seleccionado por mirada:`, object);
        
        // Marcar como seleccionado
        object.userData.selected = true;
        
        // Ejecutar callback si existe
        if (typeof object.userData.onSelect === 'function') {
            object.userData.onSelect(object);
        }
        
        // Efecto visual de confirmación
        this.playSelectionEffect(object);
        
        // Resetear después de un tiempo
        setTimeout(() => {
            if (object.userData) {
                object.userData.selected = false;
                this.highlightObject(object, false);
            }
        }, 500);
    }
    
    playSelectionEffect(object) {
        // Crear efecto de partículas/brillo
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        const effect = new THREE.Mesh(geometry, material);
        effect.position.copy(object.position);
        this.scene.add(effect);
        
        // Animación de expansión y desvanecimiento
        const startTime = Date.now();
        const duration = 500; // ms
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                effect.scale.setScalar(1 + progress * 2);
                effect.material.opacity = 0.5 * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(effect);
                effect.geometry.dispose();
                effect.material.dispose();
            }
        };
        
        animate();
    }
    
    // Método para registrar objetos en el juego
    registerGameObjects(game) {
        // Registrar power-ups como seleccionables
        game.obstacleManager.powerUps.forEach(powerUp => {
            this.registerSelectableObject(powerUp.mesh, (obj) => {
                console.log(`⚡ Power-up seleccionado por mirada: ${powerUp.powerUpType}`);
                // Aquí podrías activar el power-up automáticamente
            });
        });
        
        // Registrar monedas
        game.obstacleManager.coins.forEach(coin => {
            this.registerSelectableObject(coin.mesh, (obj) => {
                console.log("💰 Moneda seleccionada por mirada");
                // Podrías atraer la moneda al jugador
            });
        });
        
        console.log(`✅ ${this.selectableObjects.length} objetos registrados para selección por mirada`);
    }
}