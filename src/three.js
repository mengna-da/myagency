// Original imports
// import * as THREE from 'three'
// import {addLight} from './addDefaultLight'
// import { HDRI } from './environment'
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
// import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
// import { StageManager } from './stageManager'
// import { AvatarManager } from './avatarManager'
// import { AnimationManager } from './animationManager'

// Deno-compatible imports
import * as THREE from 'https://esm.sh/three@0.177.0'
import {addLight} from './addDefaultLight.js'
import { HDRI } from './environment.js'
import { OrbitControls } from 'https://esm.sh/three@0.177.0/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'https://esm.sh/three@0.177.0/examples/jsm/libs/lil-gui.module.min.js'
import { StageManager } from './stageManager.js'
import { AvatarManager } from './avatarManager.js'
import { AnimationManager } from './animationManager.js'

const renderer = new THREE.WebGLRenderer({antialias: true})
const clock = new THREE.Clock()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
const meshes = {}
const lights = {}
const mixers = [] //animation storage
const scene = new THREE.Scene()
const controls = new OrbitControls(camera, renderer.domElement)
const gui = new GUI()
gui.domElement.style.display = 'none' // Hide GUI immediately after creation

// Make availableAnimations globally accessible
window.availableAnimations = []

const avatarParams = {
  scaleX: 30,
  scaleY: 35,
  scaleZ: 30,
  currentAnimation: 'look',
  playbackSpeed: 0.6
}

// Store animation data
const animationData = {
  mixer: null,
  animations: [],
  actions: new Map()
}

let animationFolder = null
let stageManager
let avatarManager

// Make animation functions available globally
window.avatarParams = avatarParams
window.updateAnimation = updateAnimation
window.animationData = animationData

init()

function init(){
  // Set up renderer with proper size and pixel ratio
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  document.body.appendChild(renderer.domElement)

  // Position renderer canvas to cover entire viewport
  renderer.domElement.style.position = 'fixed'
  renderer.domElement.style.top = '0'
  renderer.domElement.style.left = '0'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.zIndex = '-1'

  // Position GUI in lower left
  gui.domElement.style.position = 'fixed'
  gui.domElement.style.bottom = '20px'
  gui.domElement.style.left = '20px'
  gui.domElement.style.top = 'auto'

  //add lights to our lights object
  lights.default = addLight()
  scene.add(lights.default)

  // Setup GUI controls
  const avatarFolder = gui.addFolder('Avatar Scale')
  avatarFolder.add(avatarParams, 'scaleX', 1, 100).name('Scale X').onChange(updateAvatarScale)
  avatarFolder.add(avatarParams, 'scaleY', 1, 100).name('Scale Y').onChange(updateAvatarScale)
  avatarFolder.add(avatarParams, 'scaleZ', 1, 100).name('Scale Z').onChange(updateAvatarScale)
  avatarFolder.close()

  // Create animation folder
  animationFolder = gui.addFolder('Animations')
  animationFolder.add(avatarParams, 'currentAnimation', animationData.animations)
    .name('Select Animation')
    .onChange(updateAnimation)
  animationFolder.add(avatarParams, 'playbackSpeed', 0.1, 2.0, 0.1)
    .name('Playback Speed')
    .onChange(updatePlaybackSpeed)
  animationFolder.open()

  camera.position.set(0, 0, 50)
  
  // Initialize managers
  avatarManager = new AvatarManager(scene, meshes, mixers, avatarParams)
  avatarManager.setupAnimations = setupAnimations // Pass the setupAnimations function
  
  // Create avatars
  instances()
  
  // Initialize animation manager
  const animationManager = new AnimationManager(meshes, mixers, avatarParams)
  
  // Initialize stage manager with animation manager
  stageManager = new StageManager(meshes, avatarManager.getAvatars(), animationManager)
  stageManager.setupKeyboardControls()
  
  // Make animation manager available globally for WebSocket handler
  window.animationManager = animationManager
  window.stageManager = stageManager
  
  resize()
  animate()
}

function instances(){
  // Create all avatars
  avatarManager.createAvatar(1, { x: 0, y: -30, z: 0 }, true) // First avatar visible
  avatarManager.createAvatar(2, { x: 10, y: -30, z: 0 }, false) // Hide other avatars
  avatarManager.createAvatar(3, { x: -15, y: -30, z: -15 }, false)
  avatarManager.createAvatar(4, { x: 15, y: -30, z: -15 }, false)
  avatarManager.createAvatar(5, { x: 0, y: -30, z: -20 }, false)
  avatarManager.createAvatar(6, { x: -17.3, y: -30, z: -10 }, false)
  avatarManager.createAvatar(7, { x: 17.3, y: -30, z: -10 }, false)
  avatarManager.createAvatar(8, { x: 0, y: -30, z: 20 }, false)

  // Set initial animation after a short delay to ensure everything is loaded
  setTimeout(() => {
    if (animationData.actions.has('look')) {
      const initialAnimation = animationData.actions.get('look')
      if (mixers[0]) { // First avatar's mixer
        mixers[0].stopAllAction()
        const action = mixers[0].clipAction(initialAnimation)
        action.timeScale = avatarParams.playbackSpeed
        action.play()
      }
    }
  }, 100)
}

function updateAvatarScale() {
  if (meshes.avatar1) {
      meshes.avatar1.scale.set(avatarParams.scaleX, avatarParams.scaleY, avatarParams.scaleZ)
  }
}

function setupAnimations(animations, mixer) {
  // Store the mixer
  animationData.mixer = mixer
  
  // Clear previous animations
  animationData.animations = []
  animationData.actions.clear()
  
  // Define custom names for each animation
  const animationNames = [
    'wave',
    'spin',
    'reach',
    'jumpdown',
    'thriller',
    'fight',
    'look',
    'catwalkaway',
    'bow',
    'clap',
    'puzzle',
    'pray',
    'shoot',
    'point',
    'dead',
    'fly',
    'catwalk',
    'silly dance',
    'zombie',
    'jump'
  ]
  
  // Create user-friendly names and store animations
  animations.forEach((clip, index) => {
    // Use custom name if available, otherwise use default
    const friendlyName = animationNames[index] || `Animation ${index + 1}`
    animationData.animations.push(friendlyName)
    animationData.actions.set(friendlyName, clip)
  })

  // Update the GUI control
  if (animationFolder) {
    animationFolder.destroy()
  }
  
  animationFolder = gui.addFolder('Animations')
  animationFolder.add(avatarParams, 'currentAnimation', animationData.animations)
    .name('Select Animation')
    .onChange(updateAnimation)
  animationFolder.add(avatarParams, 'playbackSpeed', 0.1, 2.0, 0.1)
    .name('Playback Speed')
    .onChange(updatePlaybackSpeed)
  animationFolder.open()
}

function updateAnimation() {
  if (!animationData.mixer) return

  // If we're in stage 0, use the old behavior
  if (stageManager.currentStage === 0) {
    // Stop all current animations
    for (const mixer of mixers) {
      mixer.stopAllAction()
    }

    // Play selected animation with current playback speed on all mixers
    const selectedClip = animationData.actions.get(avatarParams.currentAnimation)
    if (selectedClip) {
      for (const mixer of mixers) {
        const action = mixer.clipAction(selectedClip)
        action.timeScale = avatarParams.playbackSpeed
        action.play()
      }
    }
  } else {
    // For stages 1-4, use the animation manager
    const selectedClip = animationData.actions.get(avatarParams.currentAnimation)
    if (selectedClip) {
      // Get a random visible avatar
      const visibleAvatars = stageManager.getVisibleAvatars()
      const randomIndex = Math.floor(Math.random() * visibleAvatars.length)
      const selectedAvatar = visibleAvatars[randomIndex]
      
      // Play the animation on the selected avatar
      window.animationManager.playAnimationOnAvatar(selectedAvatar, selectedClip)
    }
  }
}

// Add new function to update playback speed
function updatePlaybackSpeed() {
  if (!animationData.mixer) return
  
  // Update the time scale of the current animation for all mixers
  const selectedClip = animationData.actions.get(avatarParams.currentAnimation)
  if (selectedClip) {
    for (const mixer of mixers) {
      const action = mixer.clipAction(selectedClip)
      action.timeScale = avatarParams.playbackSpeed
    }
  }
}

function resize(){
  window.addEventListener('resize', ()=>{
    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  })
}

function animate(){
  const delta = clock.getDelta() //time between each frame

  requestAnimationFrame(animate)

  // Update controls
  controls.update()

  //play animation mixer
  for(const mixer of mixers) {
    mixer.update(delta)
  }
  
  // Update rotation for all avatars based on their stored rotation direction
  for (let i = 1; i <= 8; i++) {
    const meshName = `avatar${i}`;
    if (meshes[meshName] && meshes[meshName].visible) {
      const rotationDirection = meshes[meshName].userData.rotationDirection || -1; // Default to counterclockwise if not set
      meshes[meshName].rotation.y += 0.002 * rotationDirection;
    }
  }

  renderer.render(scene, camera)
}