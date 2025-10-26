// Deno-compatible import
import {DirectionalLight, AmbientLight, Group} from 'https://esm.sh/three@0.177.0'

export const addLight = () => {
    // Create a group to hold all lights
    const lightGroup = new Group()
    
    // Strong ambient light to ensure no part of the model is completely dark
    const ambientLight = new AmbientLight(0xffffff, 1)
    lightGroup.add(ambientLight)
    
    // Main directional light (front)
    const mainLight = new DirectionalLight(0xffffff, 1)
    mainLight.position.set(5, 5, 5)
    lightGroup.add(mainLight)
    
    // Fill light (back)
    const fillLight = new DirectionalLight(0xffffff, 1)
    fillLight.position.set(-5, 5, -5)
    lightGroup.add(fillLight)
    
    // Side light (left)
    const sideLight = new DirectionalLight(0xffffff, 1)
    sideLight.position.set(-5, 5, 5)
    lightGroup.add(sideLight)
    
    // Side light (right)
    const sideLight2 = new DirectionalLight(0xffffff, 1)
    sideLight2.position.set(5, 5, -5)
    lightGroup.add(sideLight2)
    
    return lightGroup
}