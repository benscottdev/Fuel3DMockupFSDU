import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

/** Set `false` to drop bloom and keep only tone map / output (much cheaper). */
const ENABLE_BLOOM = true

/** Bloom internal resolution scale (0.25–1). Lower = faster, slightly softer bloom. */
const BLOOM_RES_SCALE = 0.35

/** Bloom: strength, radius, threshold — see comments on UnrealBloomPass below */
const BLOOM_STRENGTH = 0.03
const BLOOM_RADIUS = 0.2
const BLOOM_THRESHOLD = 2.4

/**
 * Lightweight stack: scene → optional bloom (quarter-ish res) → output (ACES / color space).
 * SMAA + film were removed — they cost several full-screen passes each frame.
 */
export function createSceneComposer(renderer, scene, camera, width, height) {
	const composer = new EffectComposer(renderer)
	composer.setPixelRatio(renderer.getPixelRatio())
	composer.setSize(width, height)

	composer.addPass(new RenderPass(scene, camera))

	if (ENABLE_BLOOM) {
		const rw = Math.max(128, Math.floor(width * BLOOM_RES_SCALE))
		const rh = Math.max(128, Math.floor(height * BLOOM_RES_SCALE))
		// UnrealBloomPass(resolution, strength, radius, threshold)
		composer.addPass(
			new UnrealBloomPass(new THREE.Vector2(rw, rh), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD),
		)
	}

	composer.addPass(new OutputPass())

	return {
		composer,
		setSize(w, h) {
			composer.setSize(w, h)
		},
		dispose() {
			composer.dispose()
		},
	}
}
