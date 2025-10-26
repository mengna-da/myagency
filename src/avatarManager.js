// Original imports
// import Model from './Model'
// import * as THREE from 'three'

// Deno-compatible imports
import Model from './model.js'
import * as THREE from 'https://esm.sh/three@0.177.0'

export class AvatarManager {
  constructor(scene, meshes, mixers, avatarParams) {
    this.scene = scene
    this.meshes = meshes
    this.mixers = mixers
    this.avatarParams = avatarParams
    this.avatars = []
  }

  createAvatar(index, position, visible = false) {
    const avatar = new Model({
      name: `avatar${index}`,
      scene: this.scene,
      meshes: this.meshes,
      url: '/public/20animations.glb',
      scale: new THREE.Vector3(
        this.avatarParams.scaleX,
        this.avatarParams.scaleY,
        this.avatarParams.scaleZ
      ),
      position: new THREE.Vector3(position.x, position.y, position.z),
      visible: visible,
      replace: false,
      animationState: true,
      mixers: this.mixers,
      callback: (mesh) => {
        // Ensure visibility is set correctly
        mesh.visible = visible
        
        if (mesh.userData.animations && this.mixers[index - 1]) {
          this.setupAnimations(mesh.userData.animations, this.mixers[index - 1])
        }
      }
    })
    
    avatar.init()
    this.avatars.push(avatar)
    return avatar
  }

  setupAnimations(animations, mixer) {
    // This will be implemented in the main file
    // We'll pass the setupAnimations function from there
  }

  getAvatars() {
    return this.avatars
  }

  setAvatarVisibility(index, visible) {
    const meshName = `avatar${index}`
    if (this.meshes[meshName]) {
      this.meshes[meshName].visible = visible
    }
  }
} 