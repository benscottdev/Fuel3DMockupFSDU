import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js'

/** Bloom internal resolution scale (0.25–1). Lower = faster, slightly softer bloom. */
const BLOOM_RES_SCALE = 0.35

/** Bloom: strength, radius, threshold */
const BLOOM_STRENGTH = 0.03
const BLOOM_RADIUS = 0.1
const BLOOM_THRESHOLD = 4

/**
 * @param {object} [options]
 * @param {boolean} [options.performanceMode] — skip EffectComposer (no bloom / FXAA / extra RTs); uses renderer tone mapping only.
 */
export function createSceneComposer(renderer, scene, camera, width, height, options = {}) {
	const { performanceMode = false } = options

	if (performanceMode) {
		return {
			renderFrame() {
				renderer.render(scene, camera)
			},
			setSize() {
				/* renderer sized by caller */
			},
			dispose() {},
		}
	}

	const composer = new EffectComposer(renderer)
	composer.setPixelRatio(renderer.getPixelRatio())
	composer.setSize(width, height)

	const opaqueBg = scene.background && scene.background.isColor ? scene.background : null
	composer.addPass(new RenderPass(scene, camera, null, opaqueBg, opaqueBg ? 1 : 0))

	const rw = Math.max(128, Math.floor(width * BLOOM_RES_SCALE))
	const rh = Math.max(128, Math.floor(height * BLOOM_RES_SCALE))
	composer.addPass(new UnrealBloomPass(new THREE.Vector2(rw, rh), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD))

	composer.addPass(new OutputPass())
	composer.addPass(new FXAAPass())

	return {
		renderFrame() {
			composer.render()
		},
		setSize(w, h) {
			composer.setSize(w, h)
		},
		dispose() {
			composer.dispose()
		},
	}
}
