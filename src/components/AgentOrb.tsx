import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from 'next-themes';

// Shader material for the orb
const OrbMaterial = ({ color }: { color: string }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const timeRef = useRef(0);

  useFrame((state) => {
    if (materialRef.current) {
      timeRef.current += 0.01;
      materialRef.current.uniforms.time.value = timeRef.current;
      const mouse = materialRef.current.uniforms.mouse.value;
      mouse.lerp(new THREE.Vector2(state.mouse.x * 0.5, state.mouse.y * 0.5), 0.1);
    }
  });

  const shader = useMemo(
    () => ({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(color) },
        mouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform vec2 mouse;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vec2 uv = vUv;
          vec2 p = uv - 0.5;
          
          // Animated gradient
          float dist = length(p);
          float gradient = smoothstep(0.3, 0.0, dist);
          
          // Subtle pulse
          float pulse = sin(time * 2.0) * 0.1 + 0.9;
          
          // Mouse interaction
          vec2 mouseEffect = mouse * 0.1;
          float mouseDist = length(p - mouseEffect);
          float mouseGradient = smoothstep(0.4, 0.0, mouseDist);
          
          // Combine effects
          float alpha = gradient * pulse * (0.15 + mouseGradient * 0.1);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
    }),
    [color]
  );

  return <shaderMaterial ref={materialRef} {...shader} transparent />;
};

const Orb = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.001;
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <OrbMaterial color="#22c55e" />
    </mesh>
  );
};

export function AgentOrb() {
  const { theme } = useTheme();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <Orb />
      </Canvas>
    </div>
  );
}
