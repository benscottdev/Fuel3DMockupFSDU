import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { threeModels } from './models'

import genericFrame from './static/models/GenericFrame.glb'
import grainNoiseUrl from './static/textures/noise.jpeg'

import Roku_1 from "./static/models/Roku_1.glb";


export function Three() {
  const containerRef = useRef(null)

  const [currentModel, setCurrentModel] = useState(Roku_1);

  /**
     * Model Manager
     */

  const selectModel = (model) => {
    setCurrentModel(model.modelLink)
  }


  useEffect(() => {
    let disposed = false
    let envMap = null

    /**
     * Scene Admin Stuff
     */
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111827)

    const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 100)
    camera.position.set(0, 0, 9)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5
    container.appendChild(renderer.domElement)

    // Movement Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup)

    /**
     * Loaders
     */

    const hdrUrl = '/monochrome_studio_04_1k.hdr'
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()

    new HDRLoader().load(
      hdrUrl,
      (texture) => {
        if (disposed) {
          texture.dispose()
          pmrem.dispose()
          return
        }
        texture.mapping = THREE.EquirectangularReflectionMapping
        const { texture: prefiltered } = pmrem.fromEquirectangular(texture)
        envMap = prefiltered
        scene.environment = envMap
        scene.environmentIntensity = 0.6
        texture.dispose()
        pmrem.dispose()
      },
      undefined,
      (err) => {
        pmrem.dispose()
        console.warn('[HDRI]', err)
      },
    )

    let metalGrain = null
    let grainTexture = null

    const gltfLoader = new GLTFLoader()
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(
      grainNoiseUrl,
      (normalTex) => {
        if (disposed) {
          normalTex.dispose()
          return
        }
        grainTexture = normalTex
        normalTex.colorSpace = THREE.LinearSRGBColorSpace
        normalTex.wrapS = THREE.RepeatWrapping
        normalTex.wrapT = THREE.RepeatWrapping
        normalTex.repeat.set(12, 12)

        metalGrain = new THREE.MeshStandardMaterial({
          color: 0x272727,
          metalness: 0.99,
          roughness: 0.2,
          normalMap: normalTex,
          normalScale: new THREE.Vector2(0.2, 0.2),
          side: THREE.DoubleSide,
        })

        gltfLoader.load(genericFrame, (gltf) => {
          if (disposed || !metalGrain) return

          const genericModel = gltf.scene
          genericModel.scale.set(0.3, 0.3, 0.3)
          genericModel.position.y = -1.4

          genericModel.traverse((child) => {
            if (child.isMesh) {
              child.material = metalGrain
            }
          })

          modelGroup.add(genericModel)
        })
      },
      undefined,
      (err) => {
        console.warn('[grain texture]', err)
      },
    )

    let brandModel;
    gltfLoader.load(currentModel, (gltf) => {
      brandModel = gltf.scene
      brandModel.scale.set(0.3, 0.3, 0.3)
      brandModel.position.y = -1.4

      modelGroup.add(brandModel)
    })

    /**
     * Cursor Movement
     */
    let cursorPos = {
      x: -1,
      y: -1
    }

    const updateCursorPos = (e) => {
      cursorPos.x = e.clientX / window.innerWidth * 2 - 1
      cursorPos.y = e.clientY / window.innerHeight * 2 - 1

      // console.log(`x: ${cursorPos.x}`)
      // console.log(`y: ${cursorPos.y}`)

      gsap.to(modelGroup.rotation, {
        y: cursorPos.x - 0.5 * 3,
        x: cursorPos.y * 0.4,
        duration: 1,
      })

    }

    window.addEventListener('mousemove', updateCursorPos)



    /**
     * Lighting
     */

    const key = new THREE.DirectionalLight(0xffffff, 2)
    key.position.set(4, 3, 1)
    // scene.add(key)


    /**
     * Scene Admin Stuff Cont..
     */
    let animationId = 0

    // Animation
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animationId = requestAnimationFrame(animate)

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)


    /**
     * CleanUp
     */
    return () => {
      disposed = true
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', updateCursorPos)
      modelGroup.traverse((c) => {
        if (c.isMesh) {
          c.geometry?.dispose()
          c.material = null
        }
      })
      modelGroup.clear()
      metalGrain?.dispose()
      grainTexture?.dispose()
      envMap?.dispose()
      scene.environment = null
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [currentModel])

  return (
    <>
      <label className="modelSelection" htmlFor="fsdu-model-select">
        {/* <span className="modelSelection__label">Model</span> */}
        <select
          id="fsdu-model-select"
          className="modelSelection__select"
          value={currentModel}
          onChange={(e) => {
            const next = threeModels.find((m) => m.modelLink === e.target.value)
            if (next) selectModel(next)
          }}
        >
          {threeModels.map((model) => (
            <option key={model.id} value={model.modelLink}>
              {model.modelName}
            </option>
          ))}
        </select>
      </label>

      <div ref={containerRef} className="scene-root" />
    </>
  )
}
