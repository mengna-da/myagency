export class AnimationManager {
  constructor(meshes, mixers, avatarParams) {
    this.meshes = meshes
    this.mixers = mixers
    this.avatarParams = avatarParams
    this.currentStage = 0
    this.savedChoices = []
    this.avatarAnimations = new Map() // Tracks which animation each avatar is playing
  }

  // Handle stage changes
  onStageChange(newStage, visibleAvatars) {
    this.currentStage = newStage
    
    if (newStage === 0) {
      // Reset to single avatar mode
      this.avatarAnimations.clear()
      return
    }

    // For stages 1-4, distribute saved choices among visible avatars
    this.distributeAnimations(visibleAvatars)
  }

  // Distribute saved choices among visible avatars
  distributeAnimations(visibleAvatars) {
    if (this.savedChoices.length === 0) return

    // Create a copy of saved choices to avoid modifying the original
    let availableChoices = [...this.savedChoices]
    
    visibleAvatars.forEach((avatarIndex) => {
      if (availableChoices.length === 0) {
        // If we run out of unique choices, refill the available choices
        availableChoices = [...this.savedChoices]
      }
      
      // Randomly select an animation from available choices
      const randomIndex = Math.floor(Math.random() * availableChoices.length)
      const animation = availableChoices[randomIndex]
      
      // Remove the selected animation from available choices
      availableChoices.splice(randomIndex, 1)
      
      // Play the animation on this avatar
      this.playAnimationOnAvatar(avatarIndex, animation)
    })
  }

  // Handle new audience input
  handleNewChoice(choice, visibleAvatars) {
    if (this.currentStage === 0) {
      // In stage 0, just play on the single avatar
      this.playAnimationOnAvatar(1, choice)
      return
    }

    // For stages 1-4, randomly select one visible avatar
    const randomIndex = Math.floor(Math.random() * visibleAvatars.length)
    const selectedAvatar = visibleAvatars[randomIndex]
    
    // Play the new animation on the selected avatar
    this.playAnimationOnAvatar(selectedAvatar, choice)
  }

  // Play animation on a specific avatar
  playAnimationOnAvatar(avatarIndex, animationClip) {
    const meshName = `avatar${avatarIndex}`
    const mixer = this.mixers[avatarIndex - 1]
    
    console.log('Attempting to play animation:', {
      avatarIndex,
      meshName,
      hasMesh: !!this.meshes[meshName],
      hasMixer: !!mixer,
      hasAnimationClip: !!animationClip,
      meshVisible: this.meshes[meshName] ? this.meshes[meshName].visible : false
    })
    
    if (!this.meshes[meshName] || !mixer || !animationClip) {
      console.log('Missing required components:', {
        mesh: !!this.meshes[meshName],
        mixer: !!mixer,
        animationClip: !!animationClip
      })
      return
    }

    // Check if the avatar is visible
    if (!this.meshes[meshName].visible) {
      console.log(`Avatar ${avatarIndex} is not visible, skipping animation. Mesh details:`, {
        name: meshName,
        visible: this.meshes[meshName].visible,
        position: this.meshes[meshName].position,
        userData: this.meshes[meshName].userData
      })
      return
    }

    // Stop current animation
    mixer.stopAllAction()

    // Play new animation
    const action = mixer.clipAction(animationClip)
    action.timeScale = this.avatarParams.playbackSpeed
    action.play()

    console.log(`Successfully played animation on avatar ${avatarIndex}`)

    // Store which animation this avatar is playing
    this.avatarAnimations.set(avatarIndex, animationClip)
  }

  // Save current choices
  saveChoices(choices) {
    this.savedChoices = [...choices]
  }

  // Get current animation for an avatar
  getAvatarAnimation(avatarIndex) {
    return this.avatarAnimations.get(avatarIndex)
  }
} 