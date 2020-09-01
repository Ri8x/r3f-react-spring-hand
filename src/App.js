import * as THREE from 'three'
import React, { Suspense, useEffect, useState, useRef } from 'react'
import { Canvas, useThree, useLoader, useFrame } from 'react-three-fiber'
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls, Html, draco } from 'drei'
import { a, useSpring, useSprings } from '@react-spring/three'

function Hand(props) {
  const ref = useRef()
  const { nodes } = useLoader(GLTFLoader, '/hand-draco.glb', draco())
  const texture = useLoader(THREE.TextureLoader, '/flakes.png')
  const materialProps = {
    clearcoat: 1.0,
    clearcoatRoughness: 0,
    metalness: 0.9,
    roughness: 0.4,
    color: 'red',
    normalMap: texture,
    normalScale: [0.3, 0.3],
    'normalMap-wrapS': THREE.RepeatWrapping,
    'normalMap-wrapT': THREE.RepeatWrapping,
    'normalMap-repeat': [30, 30],
    'normalMap-anisotropy': 16,
    transmission: 0.6,
    opacity: 1,
    transparent: true
  }
  // useFrame((state)=>{
  //   ref.current.rotation.y = state.clock.elapsedTime*0.5
  // })
  const parts = []
  const center = new THREE.Vector3(0, 1, 0)
  for (const [key, mesh] of Object.entries(nodes)) {
    if (key.indexOf('fracturepart') > -1) {
      let scale = mesh.position.distanceTo({ x: 0, y: 5, z: 0 })
      scale = Math.min(scale / 2.5, 1)
      // scale = 1; // uncomment to see full hand
      const animated = mesh.position.clone().sub(center).multiplyScalar(1.3)
      const o = {
        scale: [scale ** 1.2, scale ** 1.2, scale ** 1.2],
        mesh: mesh,
        distance: scale,
        original: [mesh.position.x, mesh.position.y, mesh.position.z],
        animated: [animated.x, animated.y, animated.z]
      }

      parts.push(o)
    }
  }

  const [mousedown, setMousedown] = useState(false)
  const { z, scale } = useSpring({
    to: { z: mousedown ? 0 : -0.5, scale: mousedown ? 1.3 : 1 }
  })

  const [springs] = useSprings(
    parts.length,
    (i) => ({
      from: { position: [0, 5, 0] },
      to: { position: mousedown ? parts[i].animated : parts[i].original },
      config: {
        mass: 20 * parts[i].distance,
        friction: 30 * parts[i].distance
      }
    }),
    [mousedown]
  )

  return (
    <a.group {...props} ref={ref}>
      <a.mesh
        scale-x={scale}
        scale-y={scale}
        scale-z={scale}
        position={[0, 5, -0.5]}
        onPointerDown={(e) => setMousedown(true)}
        onPointerUp={(e) => setMousedown(false)}>
        <sphereBufferGeometry attach="geometry" args={[0.4, 20, 20]} />
        <meshPhysicalMaterial {...materialProps} transmission={0.2} attach="material" />
      </a.mesh>
      {parts.map(function (o, index) {
        const transmission = Math.pow(Math.min(0.95, 1 - o.distance), 0.4)
        const { position } = springs[index]
        return (
          <a.group scale={o.scale} position={position} rotation={o.mesh.rotation} key={index}>
            <a.mesh geometry={o.mesh.geometry}>
              <meshPhysicalMaterial {...materialProps} side={THREE.BackSide} />
            </a.mesh>
            <a.mesh geometry={o.mesh.geometry}>
              <meshPhysicalMaterial {...materialProps} transmission={transmission} color="white" />
            </a.mesh>
          </a.group>
        )
      })}
    </a.group>
  )
}

function Environment({ background = false }) {
  const { gl, scene } = useThree()
  const [cubeMap] = useLoader(HDRCubeTextureLoader, [['px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr']], (loader) => {
    loader.setDataType(THREE.UnsignedByteType)
    loader.setPath('/pisaHDR/')
  })
  useEffect(() => {
    const gen = new THREE.PMREMGenerator(gl)
    gen.compileEquirectangularShader()
    const hdrCubeRenderTarget = gen.fromCubemap(cubeMap)
    cubeMap.dispose()
    gen.dispose()
    if (background) scene.background = hdrCubeRenderTarget.texture
    scene.environment = hdrCubeRenderTarget.texture
    return () => (scene.environment = scene.background = null)
  }, [cubeMap])
  return null
}
//
export default function App() {
  return (
    <Canvas invalidateFrameloop pixelRatio={window.devicePixelRatio} camera={{ position: [0, 0, 4] }}>
      <directionalLight position={[10, 10, 5]} intensity={2} />
      <directionalLight position={[-10, -10, -5]} intensity={1} />
      <Suspense fallback={<Html>loading..</Html>}>
        <Environment />
        <Hand position={[0, -5, 0]} />
      </Suspense>
      <OrbitControls />
    </Canvas>
  )
}
