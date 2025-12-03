// -----------------------------------------------------------------
// --- VRControls.js (PRIMERA PERSONA INMERSIVA - MEJORADO)
// -----------------------------------------------------------------

import * as THREE from 'three';
import { Config } from './Config.js';

export class VRControls {
    constructor(camera, renderer, player, scene, cameraContainer) {
        this.camera = camera;
        this.renderer = renderer;
        this.player = player;
        this.scene = scene;
        this.cameraContainer = cameraContainer;
        
        this.controllers = [];
        this.controllerGrips = [];
        this.raycaster = new THREE.Raycaster();
        this.gazeTimer = 0;
        this.lastGazeLane = 1;
        
        // NUEVO: Sistema Point to Select
        this.pointedObject = null;
        this.pointerTimer = 0;
        this.pointerTimeRequired = 0.5; // medio segundo para seleccionar
        
        // NUEVO: Rayos visuales mejorados
        this.rayLines = [];
        
        this.setupControllers();
        console.log("✅ VRControls primera persona inicializado");
    }
    
    setupControllers() {
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            const controllerGrip = this.renderer.xr.getControllerGrip(i);
            
            this.scene.add(controller);
            this.scene.add(controllerGrip);
            
            this.controllers.push(controller);
            this.controllerGrips.push(controllerGrip);
            
            // AÑADIR: Modelo visual para el controller (opcional)
            this.addControllerModel(controllerGrip, i);
            
            // AÑADIR: Raycaster para apuntar (Point to Select)
            this.addPointerRay(controller, i);
            
            controller.addEventListener('selectstart', () => this.onSelectStart(i));
            controller.addEventListener('selectend', () => this.onSelectEnd(i));
            controller.addEventListener('squeezestart', () => this.onSqueezeStart(i));
            controller.addEventListener('squeezeend', () => this.onSqueezeEnd(i));
            
            console.log(`🎮 Controller ${i} configurado`);
        }
        
        // NUEVO: Añadir modelos 3D a los controllers si están disponibles
        this.loadControllerModels();
    }
    
    addControllerModel(controllerGrip, index) {
        // Crear un modelo simple si no hay assets
        const geometry = new THREE.BoxGeometry(0.02, 0.1, 0.02);
        const material = new THREE.MeshBasicMaterial({ 
            color: index === 0 ? 0xff4444 : 0x4444ff 
        });
        const mesh = new THREE.Mesh(geometry, material);
        controllerGrip.add(mesh);
    }
    
    loadControllerModels() {
        // Podrías cargar modelos FBX/GLTF para los controllers
        // Por ahora usamos geometrías simples
        console.log("📱 Controller models placeholder cargados");
    }
    
    // NUEVO: Point to Select mejorado (Documentación 3)
    addPointerRay(controller, index) {
        // Rayo más visible como en webxr-point-to-select-w-move.html
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -10) // Más largo
        ]);
        
        const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
            color: index === 0 ? 0xff0000 : 0x0000ff,
            linewidth: 3,
            transparent: true,
            opacity: 0.7
        }));
        line.name = `controller-ray-${index}`;
        controller.add(line);
        this.rayLines.push(line);
        
        // Cursor en punta del rayo
        const cursorGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const cursorMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const cursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
        cursor.name = `controller-cursor-${index}`;
        cursor.position.z = -5; // Posición inicial
        controller.add(cursor);
        
        // Efecto de partículas alrededor del cursor (opcional)
        this.addCursorEffect(cursor);
        
        console.log(`🎯 Rayo pointer configurado para controller ${index}`);
    }
    
    addCursorEffect(cursor) {
        // Añadir anillo alrededor del cursor
        const ringGeometry = new THREE.RingGeometry(0.03, 0.035, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        cursor.add(ring);
        
        // Animación del anillo
        let time = 0;
        const animateRing = () => {
            time += 0.1;
            ring.scale.setScalar(1 + Math.sin(time) * 0.2);
            ring.rotation.z += 0.02;
            
            if (cursor.parent) {
                requestAnimationFrame(animateRing);
            }
        };
        animateRing();
    }
    
    onSelectStart(controllerIndex) {
        console.log(`Controller ${controllerIndex} - Select Start`);
        
        // Feedback visual
        this.highlightController(controllerIndex, true);
        
        if (controllerIndex === 0) {
            this.player.jump();
            window.dispatchEvent(new CustomEvent('player-jump'));
        } else if (controllerIndex === 1) {
            this.player.roll();
            window.dispatchEvent(new CustomEvent('player-roll'));
        }
    }
    
    onSelectEnd(controllerIndex) {
        console.log(`Controller ${controllerIndex} - Select End`);
        this.highlightController(controllerIndex, false);
    }
    
    onSqueezeStart(controllerIndex) {
        console.log(`Controller ${controllerIndex} - Squeeze Start`);
        // Podrías usar squeeze para otras acciones (cambiar arma, etc.)
    }
    
    onSqueezeEnd(controllerIndex) {
        console.log(`Controller ${controllerIndex} - Squeeze End`);
    }
    
    highlightController(controllerIndex, highlight) {
        const controllerGrip = this.controllerGrips[controllerIndex];
        if (controllerGrip && controllerGrip.children.length > 0) {
            const mesh = controllerGrip.children[0];
            if (mesh.material) {
                mesh.material.color.setHex(highlight ? 0xffffff : (controllerIndex === 0 ? 0xff4444 : 0x4444ff));
                
                // Efecto de pulso
                if (highlight) {
                    const originalScale = mesh.scale.clone();
                    mesh.scale.multiplyScalar(1.2);
                    
                    setTimeout(() => {
                        if (mesh.scale) {
                            mesh.scale.copy(originalScale);
                        }
                    }, 100);
                }
            }
        }
    }
    
    update(deltaTime) {
        if (this.controllers.length > 0) {
            this.handleGazeControls(deltaTime);
            this.handlePointerControls(deltaTime);
            this.updateCameraPosition();
        }
    }
    
    // NUEVO: Point to Select implementation
    handlePointerControls(deltaTime) {
        for (let i = 0; i < this.controllers.length; i++) {
            const controller = this.controllers[i];
            const rayLine = this.rayLines[i];
            const cursor = controller.getObjectByName(`controller-cursor-${i}`);
            
            if (!rayLine || !cursor) continue;
            
            // Configurar raycaster desde el controller
            this.raycaster.setFromCamera({ x: 0, y: 0 }, controller);
            
            // Buscar objetos seleccionables
            const selectableObjects = this.scene.children.filter(obj => 
                obj.userData && obj.userData.selectable
            );
            
            const intersects = this.raycaster.intersectObjects(selectableObjects);
            
            if (intersects.length > 0) {
                const intersect = intersects[0];
                
                // Mover cursor al punto de intersección
                cursor.position.copy(intersect.point);
                cursor.position.sub(controller.position);
                cursor.position.normalize().multiplyScalar(-5);
                
                // Acortar línea visual
                const linePoints = rayLine.geometry.attributes.position.array;
                linePoints[3] = cursor.position.z; // Actualizar punto final Z
                rayLine.geometry.attributes.position.needsUpdate = true;
                
                // Resaltar objeto apuntado
                if (this.pointedObject !== intersect.object) {
                    // Des-resaltar objeto anterior
                    if (this.pointedObject && this.pointedObject.userData) {
                        this.pointedObject.userData.pointed = false;
                        this.updateObjectHighlight(this.pointedObject, false);
                    }
                    
                    // Resaltar nuevo objeto
                    this.pointedObject = intersect.object;
                    this.pointedObject.userData.pointed = true;
                    this.pointerTimer = 0;
                    
                    this.updateObjectHighlight(this.pointedObject, true);
                }
                
                // Incrementar timer
                this.pointerTimer += deltaTime;
                
                // Feedback visual en el cursor
                this.updateCursorSelection(cursor, this.pointerTimer / this.pointerTimeRequired);
                
                // Si se mantiene apuntando el tiempo suficiente, seleccionar
                if (this.pointerTimer >= this.pointerTimeRequired) {
                    this.onPointerSelect(this.pointedObject, i);
                    this.pointerTimer = 0;
                }
                
            } else {
                // Restaurar cursor a posición por defecto
                cursor.position.z = -5;
                
                // Restaurar línea completa
                const linePoints = rayLine.geometry.attributes.position.array;
                linePoints[3] = -10;
                rayLine.geometry.attributes.position.needsUpdate = true;
                
                // Des-resaltar objeto si había uno
                if (this.pointedObject) {
                    this.pointedObject.userData.pointed = false;
                    this.updateObjectHighlight(this.pointedObject, false);
                    this.pointedObject = null;
                }
                
                this.pointerTimer = 0;
                this.resetCursor(cursor);
            }
        }
    }
    
    updateCursorSelection(cursor, progress) {
        // Cambiar color y tamaño basado en progreso
        if (cursor.material) {
            if (progress < 0.33) {
                cursor.material.color.setHex(0xff0000);
            } else if (progress < 0.66) {
                cursor.material.color.setHex(0xffaa00);
            } else {
                cursor.material.color.setHex(0x00ff00);
            }
            
            cursor.scale.setScalar(1 + progress * 0.5);
        }
    }
    
    resetCursor(cursor) {
        cursor.scale.set(1, 1, 1);
        if (cursor.material) {
            cursor.material.color.setHex(0xffff00);
        }
    }
    
    updateObjectHighlight(object, highlight) {
        if (!object || !object.isMesh) return;
        
        if (highlight) {
            // Efecto de resaltado temporal
            if (!object.userData.originalEmissive) {
                object.userData.originalEmissive = object.material.emissive 
                    ? object.material.emissive.clone() 
                    : new THREE.Color(0x000000);
            }
            
            object.material.emissive = new THREE.Color(0xffff00);
            object.material.emissiveIntensity = 0.3;
            
        } else if (object.userData.originalEmissive) {
            // Restaurar
            object.material.emissive = object.userData.originalEmissive;
            object.material.emissiveIntensity = 1.0;
        }
    }
    
    onPointerSelect(object, controllerIndex) {
        console.log(`🎯 Objeto seleccionado por apuntado (controller ${controllerIndex}):`, object);
        
        // Ejecutar acción asociada al objeto
        if (object.userData && typeof object.userData.onSelect === 'function') {
            object.userData.onSelect(object);
        }
        
        // Feedback visual
        this.playSelectionEffect(object.position);
        
        // Feedback háptico (si está disponible)
        if (this.renderer.xr.getController(controllerIndex).inputSource && 
            this.renderer.xr.getController(controllerIndex).inputSource.hapticActuators) {
            this.triggerHapticFeedback(controllerIndex, 100, 50); // 100ms, intensidad 50%
        }
    }
    
    triggerHapticFeedback(controllerIndex, duration, intensity) {
        const controller = this.renderer.xr.getController(controllerIndex);
        if (controller.inputSource && controller.inputSource.hapticActuators) {
            const actuator = controller.inputSource.hapticActuators[0];
            if (actuator && actuator.pulse) {
                actuator.pulse(intensity / 100, duration);
            }
        }
    }
    
    playSelectionEffect(position) {
        // Efecto de partículas en la posición seleccionada
        const particleCount = 10;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = position.x + (Math.random() - 0.5) * 0.5;
            positions[i + 1] = position.y + (Math.random() - 0.5) * 0.5;
            positions[i + 2] = position.z + (Math.random() - 0.5) * 0.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffff00,
            size: 0.05,
            transparent: true
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // Animación y limpieza
        let opacity = 1;
        const animate = () => {
            opacity -= 0.02;
            particles.material.opacity = opacity;
            particles.scale.multiplyScalar(1.01);
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(particles);
                geometry.dispose();
                material.dispose();
            }
        };
        
        animate();
    }
    
    handleGazeControls(deltaTime) {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        
        const gazeDirection = new THREE.Vector3();
        this.camera.getWorldDirection(gazeDirection);
        
        const gazeAngle = Math.atan2(gazeDirection.x, gazeDirection.z);
        const gazeThreshold = Config.VR_SETTINGS.GAZE_THRESHOLD;
        
        let targetLane = this.lastGazeLane;
        
        if (gazeAngle < -gazeThreshold) {
            targetLane = 0;
        } else if (gazeAngle > gazeThreshold) {
            targetLane = 2;
        } else {
            targetLane = 1;
        }
        
        if (targetLane !== this.lastGazeLane) {
            this.gazeTimer += deltaTime;
            
            if (this.gazeTimer >= Config.VR_SETTINGS.GAZE_DURATION) {
                this.changeLane(targetLane);
                this.lastGazeLane = targetLane;
                this.gazeTimer = 0;
            }
        } else {
            this.gazeTimer = 0;
        }
    }
    
    changeLane(targetLane) {
        const currentLane = this.player.currentLane;
        
        if (targetLane !== currentLane) {
            const direction = targetLane > currentLane ? 1 : -1;
            this.player.strafe(direction);
            console.log(`👁️ Cambio de carril por mirada: ${currentLane} -> ${targetLane}`);
        }
    }
    
    updateCameraPosition() {
        if (this.cameraContainer && this.player) {
            const playerPos = this.player.group.position;
            const cameraPos = this.cameraContainer.position;
            
            // Debug opcional
            if (Math.random() < 0.01) {
                console.log("👁️ Posición VR:", {
                    jugador: { x: playerPos.x.toFixed(2), z: playerPos.z.toFixed(2) },
                    camara: { x: cameraPos.x.toFixed(2), z: cameraPos.z.toFixed(2) }
                });
            }
        }
    }
    
    debugGazeDirection() {
        const gazeDirection = new THREE.Vector3();
        this.camera.getWorldDirection(gazeDirection);
        
        console.log(`👁️ Dirección mirada:`, {
            x: gazeDirection.x.toFixed(2),
            y: gazeDirection.y.toFixed(2),
            z: gazeDirection.z.toFixed(2),
            angulo: Math.atan2(gazeDirection.x, gazeDirection.z).toFixed(2)
        });
    }
}