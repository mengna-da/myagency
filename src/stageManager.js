// Stage configurations
export const stageConfigs = {
  0: { // Single avatar in center
    positions: [
      { x: 0, y: -30, z: 0 }
    ]
  },
  1: { // Two avatars side by side
    positions: [
      { x: -10, y: -30, z: 0 },
      { x: 10, y: -30, z: 0 }
    ]
  },
  2: { // Four avatars in a square formation
    positions: [
      { x: -15, y: -30, z: -15 },
      { x: 15, y: -30, z: -15 },
      { x: -15, y: -30, z: 15 },
      { x: 15, y: -30, z: 15 }
    ]
  },
  3: { // Six avatars in a hexagonal formation
    positions: [
      { x: 0, y: -30, z: -25 },      // Front
      { x: -21.6, y: -30, z: -12.5 },  // Front left
      { x: 21.6, y: -30, z: -12.5 },   // Front right
      { x: -21.6, y: -30, z: 12.5 },   // Back left
      { x: 21.6, y: -30, z: 12.5 },    // Back right
      { x: 0, y: -30, z: 25 }        // Back
    ]
  },
  4: { // Eight avatars in a circle formation
    positions: [
      { x: 0, y: -30, z: -25 },      // Front
      { x: -17.7, y: -30, z: -17.7 }, // Front left
      { x: 17.7, y: -30, z: -17.7 },  // Front right
      { x: -25, y: -30, z: 0 },      // Left
      { x: 25, y: -30, z: 0 },       // Right
      { x: -17.7, y: -30, z: 17.7 },  // Back left
      { x: 17.7, y: -30, z: 17.7 },   // Back right
      { x: 0, y: -30, z: 25 }        // Back
    ]
  }
}

export class StageManager {
  constructor(meshes, avatars, animationManager) {
    this.meshes = meshes
    this.avatars = avatars
    this.animationManager = animationManager
    this.currentStage = 0
    this.visibleAvatars = [1] // Start with just avatar 1 visible
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
        this.visibleAvatars.push(index + 1)
        console.log(`Making avatar ${index + 1} visible`)
      } else if (this.meshes[meshName]) {
        // Avatar should be hidden in this stage
        this.meshes[meshName].visible = false
        console.log(`Hiding avatar ${index + 1}`)
      }
    })

    console.log('Updated visible avatars:', this.visibleAvatars)

    // Notify animation manager of stage change
    this.animationManager.onStageChange(newStage, this.visibleAvatars)
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