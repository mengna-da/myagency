// Stage configurations
export const stageConfigs = {
  0: { // Single avatar in center
    positions: [
      { x: 0, y: -30, z: 0 }
    ]
  },
  1: { // Two avatars side by side
    positions: [
      { x: -25, y: -30, z: 0 },
      { x: 25, y: -30, z: 0 }
    ]
  },
  2: { // Four avatars in 2x2 
    positions: [
      { x: -20, y: -30, z: 0 }, //bottom left
      { x: 20, y: -40, z: 0 },  //bottom right
      { x: -45, y: -10, z: 0 }, //top left
      { x: 30, y: 0, z: 0 }    //top right
    ],
    scale: 25
  },
  3: { // Six avatars in 3x2 
    positions: [
      { x: -30, y: -30, z: 0 }, // bottom left
      { x: 10, y: -35, z: 0 },   // bottom center
      { x: 40, y: -35, z: 0 },  // bottom right
      { x: -50, y: -10, z: 0 },  // top left
      { x: 0, y: -5, z: 0 },    // top center
      { x: 30, y: 0, z: 0 }    // top right
    ],
    scale: 20
  },
  4: { // Eight avatars in 4x2
    positions: [
      { x: -45, y: -35, z: 0 }, // bottom left
      { x: -10, y: -30, z: 0 }, // bottom left-center
      { x: 15, y: -35, z: 0 },  // bottom right-center
      { x: 40, y: -40, z: 0 },  // bottom right
      { x: -50, y: 5, z: 0 },   // top left
      { x: -20, y: -3, z: 0 },   // top left-center
      { x: 10, y: 0, z: 0 },    // top right-center
      { x: 45, y: -5, z: 0 }     // top right
    ],
    scale: 17
  }
}

export class StageManager {
  constructor(meshes, avatars, animationManager) {
    this.meshes = meshes
    this.avatars = avatars
    this.animationManager = animationManager
    this.currentStage = 0
    this.visibleAvatars = [1] // Start with just avatar 1 visible
    this.socket = window.socket // Get socket instance from window
  }

  updateStage(newStage) {
    if (newStage < 0 || newStage > 4) return
    
    this.currentStage = newStage
    const config = stageConfigs[newStage]
    
    // Track which avatars are visible in this stage
    this.visibleAvatars = []
    
    console.log('Updating stage:', {
      newStage,
      config,
      meshes: Object.keys(this.meshes)
    })
    
    // Update each avatar
    this.avatars.forEach((avatar, index) => {
      const meshName = `avatar${index + 1}`
      if (this.meshes[meshName] && index < config.positions.length) {
        // Avatar should be visible in this stage
        this.meshes[meshName].visible = true
        this.meshes[meshName].position.set(
          config.positions[index].x,
          config.positions[index].y,
          config.positions[index].z
        )
        // Apply scale if defined in config
        if (config.scale) {
          this.meshes[meshName].scale.set(config.scale, config.scale, config.scale);
        } else {
          this.meshes[meshName].scale.set(30, 35, 30); // Reset to default scale
        }
        this.visibleAvatars.push(index + 1)
        console.log(`Making avatar ${index + 1} visible`)
      } else if (this.meshes[meshName]) {
        // Avatar should be hidden in this stage
        this.meshes[meshName].visible = false
        console.log(`Hiding avatar ${index + 1}`)
      }
    })

    console.log('Updated visible avatars:', this.visibleAvatars)

    // Try to emit stage update to server
    try {
      if (window.socket && window.socket.connected) {
        console.log('Emitting stage change:', newStage);
        window.socket.emit('stageChange', newStage);
      } else {
        console.warn('Socket not connected, stage change not emitted');
      }
    } catch (error) {
      console.error('Error emitting stage change:', error);
    }

    // Dispatch custom event for stage change
    const event = new CustomEvent('stageChange', { detail: newStage });
    window.dispatchEvent(event);

    // Notify animation manager of stage change
    this.animationManager.onStageChange(newStage, this.visibleAvatars)

    // For stages 1-4, trigger a random animation for each visible avatar
    if (newStage > 0 && window.animationData && window.animationData.actions && window.animationManager) {
      const excludedAnimations = ['Catwalk away', 'Thriller', 'Jump down'];
      const animationActions = Array.from(window.animationData.actions.values()).filter(clip => !excludedAnimations.includes(clip.name));
      this.visibleAvatars.forEach(avatarIndex => {
        const randomClip = animationActions[Math.floor(Math.random() * animationActions.length)];
        // Randomly decide rotation direction (clockwise or counterclockwise)
        const rotationDirection = Math.random() > 0.5 ? 1 : -1;
        window.animationManager.playAnimationOnAvatar(avatarIndex, randomClip, rotationDirection);
      });
    }
  }

  setupKeyboardControls() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase()
      if (key === '1') {
        this.updateStage(1)
      } else if (key === '2') {
        this.updateStage(2)
      } else if (key === '3') {
        this.updateStage(3)
      } else if (key === '4') {
        this.updateStage(4)
      } else if (key === '0') {
        this.updateStage(0)
      }
    })
  }

  getVisibleAvatars() {
    console.log('Getting visible avatars:', {
      currentStage: this.currentStage,
      visibleAvatars: this.visibleAvatars,
      actualVisibility: Object.entries(this.meshes).map(([name, mesh]) => ({
        name,
        visible: mesh.visible
      }))
    })
    return this.visibleAvatars
  }
}