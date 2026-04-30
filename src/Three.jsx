import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { threeModels, bottles as bottleAssets } from './models'
import { FUEL_WORD_LOGO_WHITE_URL } from './lib/fuelBrandLogo.js'
import { createSceneComposer } from './createSceneComposer.js'

import genericFrame from './static/models/GenericFrame.glb'
import grainNoiseUrl from './static/textures/noise.jpeg'

import Roku_1 from './static/models/Roku_1.glb'

function disposeGltfSubtree(root) {
  root.traverse((child) => {
    if (!child.isMesh) return
    child.geometry?.dispose()
    const mats = child.material
    if (Array.isArray(mats)) mats.forEach((m) => m.dispose?.())
    else mats?.dispose?.()
  })
}

function normalizeBrandId(brand) {
  return String(brand ?? '')
    .trim()
    .toLowerCase()
}

export function Three() {
  const containerRef = useRef(null)

  const [currentModel, setCurrentModel] = useState(Roku_1)
  const [modelLoading, setModelLoading] = useState(true)
  const [lighting, setLighting] = useState(true)
  const [background, setBackground] = useState(0xffffff)
  const [bottlesOn, setBottlesOn] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [performanceMode, setPerformanceMode] = useState(false)
  /** Mirrors `performanceMode` for scene init / pipeline swap without reading state during render (eslint refs rule). */
  const performanceModeRef = useRef(false)

  const sceneApiRef = useRef(null)
  const brandRootRef = useRef(null)
  const bottlesRootRef = useRef(null)
  const prevBottlesOnRef = useRef(bottlesOn)
  const bottlesOnRef = useRef(bottlesOn)
  useLayoutEffect(() => {
    bottlesOnRef.current = bottlesOn
  }, [bottlesOn])

  /** Gate `modelLoading` until brand (and optional bottle) GLTFs are ready; min 1s from `startedAt`. */
  const loaderGateRef = useRef({
    startedAt: 0,
    expectBottles: false,
    brandReady: false,
    bottlesReady: true,
    hideTimeoutId: null,
  })

  const clearLoaderHideTimeout = () => {
    const id = loaderGateRef.current.hideTimeoutId
    if (id != null) {
      window.clearTimeout(id)
      loaderGateRef.current.hideTimeoutId = null
    }
  }

  const tryHideModelLoader = () => {
    const s = loaderGateRef.current
    clearLoaderHideTimeout()
    if (!s.brandReady) return
    if (s.expectBottles && !s.bottlesReady) return

    const remaining = Math.max(0, 1000 - (Date.now() - s.startedAt))
    s.hideTimeoutId = window.setTimeout(() => {
      s.hideTimeoutId = null
      setModelLoading(false)
    }, remaining)
  }

  const beginBrandModelLoadSession = (expectBottles) => {
    clearLoaderHideTimeout()
    loaderGateRef.current.startedAt = Date.now()
    loaderGateRef.current.expectBottles = expectBottles
    loaderGateRef.current.brandReady = false
    loaderGateRef.current.bottlesReady = !expectBottles
  }

  const beginBottlesOnlyLoaderSession = () => {
    clearLoaderHideTimeout()
    loaderGateRef.current.startedAt = Date.now()
    loaderGateRef.current.expectBottles = true
    loaderGateRef.current.brandReady = true
    loaderGateRef.current.bottlesReady = false
  }

  const selectModel = (model) => {
    setModelLoading(true)
    setCurrentModel(model.modelLink)
  }

  const toggleLighting = () => {
    setLighting(!lighting)
  }

  const toggleBackground = () => {
    if (background === 0xffffff) {
      setBackground(0x484848)
    } else {
      setBackground(0xffffff)
    }
  }

  const toggleBottles = () => {
    setBottlesOn((v) => !v)
  }

  const togglePerformanceMode = () => {
    setPerformanceMode((prev) => {
      const next = !prev
      performanceModeRef.current = next
      sceneApiRef.current?.setPerformancePipeline?.(next)
      return next
    })
  }

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  /** Scene, composer, frame, lights — once. */
  useEffect(() => {
    let disposed = false
    let envMap = null

    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(background)

    const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 100)
    camera.position.set(0, 0, 10)

    const renderer = new THREE.WebGLRenderer({
      antialias: false,          // big GPU cost
      powerPreference: 'high-performance',
      stencil: false,            // disable if unused
      depth: true,
      alpha: false
    })
    if (window.innerWidth > 1750) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    }
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.4
    container.appendChild(renderer.domElement)


    const pipelineHolder = {
      current: createSceneComposer(renderer, scene, camera, width, height, {
        performanceMode: performanceModeRef.current,
      }),
    }

    const setComposerSize = (w, h) => {
      pipelineHolder.current.setSize(w, h)
    }

    const setPerformancePipeline = (usePerf) => {
      pipelineHolder.current.dispose()
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      pipelineHolder.current = createSceneComposer(renderer, scene, camera, w, h, {
        performanceMode: usePerf,
      })
    }

    const modelGroup = new THREE.Group()
    modelGroup.rotation.y = -Math.PI / 2
    scene.add(modelGroup)

    const gltfLoader = new GLTFLoader()
    const bottlesGltfLoader = new GLTFLoader()
    sceneApiRef.current = {
      modelGroup,
      gltfLoader,
      bottlesGltfLoader,
      setPerformancePipeline,
    }

    let hdrUrl
    if (lighting) {
      hdrUrl = '/monochrome_studio_04_1k.hdr'
    }
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
        scene.environmentIntensity = 1
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
              child.castShadow = true
              child.receiveShadow = true
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

    // Floor & Walls

    const floorGeom = new THREE.PlaneGeometry(10, 20)
    const wallGeom = new THREE.PlaneGeometry(20, 10)



    const floorWallMat = new THREE.MeshStandardMaterial({
      color: background,
      roughness: 0.6,
      metalness: 0.2,
      DoubleSide: true
    })


    const floorMesh = new THREE.Mesh(floorGeom, floorWallMat)
    const wallMesh = new THREE.Mesh(wallGeom, floorWallMat)
    floorMesh.receiveShadow = true
    wallMesh.receiveShadow = true

    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.y = -1.535

    wallMesh.position.x = -0.48
    wallMesh.rotation.y = Math.PI / 2

    modelGroup.add(wallMesh)
    modelGroup.add(floorMesh)

    /** Orbit camera around origin; cursor drives azimuth / polar within a small range. */
    const orbitTarget = new THREE.Vector3()
    const orbitSpherical = new THREE.Spherical().setFromVector3(camera.position)
    const baseRadius = orbitSpherical.radius
    const baseTheta = orbitSpherical.theta
    const basePhi = orbitSpherical.phi
    const maxAzimuth = THREE.MathUtils.degToRad(32)
    const maxPolar = THREE.MathUtils.degToRad(24)

    const updateCursorPos = (e) => {
      const rect = container.getBoundingClientRect()
      const rw = rect.width || 1
      const rh = rect.height || 1
      const u = ((e.clientX - rect.left) / rw) * 2 - 1
      const v = ((e.clientY - rect.top) / rh) * 2 - 1

      orbitSpherical.radius = baseRadius
      orbitSpherical.theta = baseTheta + u * maxAzimuth
      orbitSpherical.phi = THREE.MathUtils.clamp(basePhi - v * maxPolar, 0.12, Math.PI - 0.12)
      orbitTarget.setFromSpherical(orbitSpherical)

      gsap.to(camera.position, {
        x: -orbitTarget.x,
        y: orbitTarget.y * 0.4,
        z: orbitTarget.z,
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }

    window.addEventListener('mousemove', updateCursorPos)




    // Lights

    const lightGeom = new THREE.BoxGeometry(1, 1, 1)
    const lightMat = new THREE.MeshStandardMaterial({

      emissive: 0xffffff,
      emissiveIntensity: lighting ? 2 : 0,
    })
    const lightMesh = new THREE.Mesh(lightGeom, lightMat)
    lightMesh.scale.set(0.5, 0.1, 0.6)
    lightMesh.position.set(0, 0.73, 0)
    modelGroup.add(lightMesh)

    const key = new THREE.DirectionalLight(0xffffff, 2)
    key.position.set(2, 0, 1)
    key.rotation.z = -1.5
    key.rotation.y = -0.5
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 0.2
    key.shadow.camera.far = 24
    key.shadow.camera.left = -9
    key.shadow.camera.right = 9
    key.shadow.camera.top = 9
    key.shadow.camera.bottom = -9
    key.shadow.bias = -0.00025
    key.shadow.normalBias = 0.035
    modelGroup.add(key)

    const pl = new THREE.PointLight(0xffffff, 1)
    pl.scale.set(0.6, 0.6, 0.6)
    pl.position.set(0.2, 0.4, 0)
    if (lighting) {
      modelGroup.add(pl)
    }

    let animationId = 0
    const animate = () => {
      // console.log(camera.position)
      animationId = requestAnimationFrame(animate)
      camera.lookAt(0, 0, 0)
      pipelineHolder.current.renderFrame()
    }
    animationId = requestAnimationFrame(animate)

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      setComposerSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      sceneApiRef.current = null
      brandRootRef.current = null
      bottlesRootRef.current = null
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

      pipelineHolder.current.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [lighting, background])

  /** Swap only the brand GLTF; loader hides when brand + optional bottles are ready (min 1s from session start). */
  useEffect(() => {
    const api = sceneApiRef.current
    if (!api) return

    const selected = threeModels.find((m) => m.modelLink === currentModel)
    const modelBrand = selected?.brand
    const bottleEntry =
      modelBrand &&
      bottleAssets.find(
        (b) =>
          b.modelLink &&
          normalizeBrandId(b.brand) === normalizeBrandId(modelBrand),
      )
    const expectBottles = !!(bottlesOnRef.current && bottleEntry)

    beginBrandModelLoadSession(expectBottles)
    setModelLoading(true)

    let cancelled = false

    const { modelGroup, gltfLoader } = api
    const previousBrand = brandRootRef.current

    gltfLoader.load(
      currentModel,
      (gltf) => {
        if (cancelled) {
          disposeGltfSubtree(gltf.scene)
          return
        }
        if (previousBrand) {
          modelGroup.remove(previousBrand)
          disposeGltfSubtree(previousBrand)
        }
        const root = gltf.scene
        root.scale.set(0.3, 0.3, 0.3)
        root.position.y = -1.4
        root.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        modelGroup.add(root)
        brandRootRef.current = root
        loaderGateRef.current.brandReady = true
        tryHideModelLoader()
      },
      undefined,
      () => {
        if (!cancelled) {
          loaderGateRef.current.brandReady = true
          tryHideModelLoader()
        }
      },
    )

    return () => {
      cancelled = true
      clearLoaderHideTimeout()
    }
  }, [currentModel, lighting, background])

  /** Bottle GLTF when enabled, selected model brand matches a bottle asset, and URL exists. */
  useEffect(() => {
    const api = sceneApiRef.current
    if (!api) return

    const wasBottlesOn = prevBottlesOnRef.current
    const { modelGroup, bottlesGltfLoader } = api
    const selected = threeModels.find((m) => m.modelLink === currentModel)
    const modelBrand = selected?.brand
    const bottleEntry =
      modelBrand &&
      bottleAssets.find(
        (b) =>
          b.modelLink &&
          normalizeBrandId(b.brand) === normalizeBrandId(modelBrand),
      )

    let cancelled = false

    const removeBottles = () => {
      const prev = bottlesRootRef.current
      if (prev) {
        modelGroup.remove(prev)
        disposeGltfSubtree(prev)
        bottlesRootRef.current = null
      }
    }

    if (!bottlesOn || !bottleEntry) {
      removeBottles()
      loaderGateRef.current.expectBottles = false
      loaderGateRef.current.bottlesReady = true
      tryHideModelLoader()
      prevBottlesOnRef.current = bottlesOn
      return () => {
        cancelled = true
        removeBottles()
      }
    }

    const toggledBottlesOn = bottlesOn && !wasBottlesOn
    if (toggledBottlesOn) {
      setModelLoading(true)
      if (loaderGateRef.current.brandReady) {
        beginBottlesOnlyLoaderSession()
      } else {
        loaderGateRef.current.expectBottles = true
        loaderGateRef.current.bottlesReady = false
      }
    }

    prevBottlesOnRef.current = bottlesOn

    bottlesGltfLoader.load(
      bottleEntry.modelLink,
      (gltf) => {
        if (cancelled) {
          disposeGltfSubtree(gltf.scene)
          return
        }
        removeBottles()
        const root = gltf.scene
        root.scale.set(0.3, 0.3, 0.3)
        root.position.y = -1.4
        root.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        modelGroup.add(root)
        bottlesRootRef.current = root
        loaderGateRef.current.bottlesReady = true
        tryHideModelLoader()
      },
      undefined,
      (err) => {
        console.warn('[bottles gltf]', err)
        if (!cancelled) {
          loaderGateRef.current.bottlesReady = true
          tryHideModelLoader()
        }
      },
    )

    return () => {
      cancelled = true
      removeBottles()
    }
  }, [currentModel, bottlesOn, lighting, background])

  return (
    <>
      {menuOpen ? (
        <div
          className="optionsMenu__backdrop"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <div className={`optionsMenu${menuOpen ? ' optionsMenu--open' : ''}`}>
        <button
          type="button"
          className="optionsMenu__toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="fsdu-options-dropdown"
          aria-label={menuOpen ? 'Close options menu' : 'Open options menu'}
        >
          <span className="optionsMenu__toggleBar" aria-hidden />
          <span className="optionsMenu__toggleBar" aria-hidden />
          <span className="optionsMenu__toggleBar" aria-hidden />
        </button>
        <div
          id="fsdu-options-dropdown"
          className="optionsMenu__dropdown"
          role="region"
          aria-label="Display options"
          inert={!menuOpen}
        >
          <button type="button" onClick={toggleLighting}>
            {lighting ? 'Lighting Off' : 'Lighting On'}
          </button>
          <button type="button" onClick={toggleBackground}>
            {background === 0x484848 ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button type="button" onClick={toggleBottles}>
            {bottlesOn ? 'Bottles Off' : 'Bottles On'}
          </button>
          <button type="button" onClick={togglePerformanceMode}>
            {performanceMode ? 'Realistic Lighting' : 'Performance Lighting'}
          </button>
        </div>
      </div>

      <label className="modelSelection" htmlFor="fsdu-model-select">
        {/* <p className='subText'>SELECT MODEL</p> */}
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

      <div className="scene-view">
        <img
          className="fuelSceneLogo"
          src={FUEL_WORD_LOGO_WHITE_URL}
          alt="Fuel"
          width={160}
          height={36}
          decoding="async"
        />
        {modelLoading ? (
          <div className="modelLoader" role="status" aria-label="Loading">
            <div className="modelLoader__spinner" />
          </div>
        ) : null}
        <div ref={containerRef} className="scene-root" />
      </div>
    </>
  )
}
