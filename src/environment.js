// Original imports
// import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
// import { EquirectangularReflectionMapping } from 'three'

// Deno-compatible imports
import { RGBELoader } from 'https://esm.sh/three@0.177.0/examples/jsm/loaders/RGBELoader.js'
import { EquirectangularReflectionMapping } from 'https://esm.sh/three@0.177.0'

export function HDRI (){
    const rgbeLoader= new RGBELoader()
    const hdrMap = rgbeLoader.load('hdri.hdr', (envMap) => {
		envMap.mapping = EquirectangularReflectionMapping
		return envMap
	})
    return hdrMap
}