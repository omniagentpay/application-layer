import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from 'next-themes';

// Shader material for the orb
const OrbMaterial = ({ color }: { color: string }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (materialRef.current) {
      // Use delta time for frame-rate independent animation
      timeRef.current += delta * 0.5;
      materialRef.current.uniforms.time.value = timeRef.current;
      const mouse = materialRef.current.uniforms.mouse.value;
      // Throttle mouse updates for better performance
      mouse.lerp(new THREE.Vector2(state.mouse.x * 0.5, state.mouse.y * 0.5), 0.05);
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
  const rotationSpeed = useMemo(() => ({ x: 0.001, y: 0.002 }), []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed.x;
      meshRef.current.rotation.y += rotationSpeed.y;
    }
  });

  // Reduced geometry complexity for better performance (16x16 instead of 32x32)
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 16, 16]} />
      <OrbMaterial color="#22c55e" />
    </mesh>
  );
};

export function AgentOrb() {
  const { theme } = useTheme();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Gracefully handle errors
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes('scheduler') || e.message?.includes('@react-three')) {
        console.warn('[AgentOrb] Failed to load, skipping orb animation');
        setHasError(true);
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (prefersReducedMotion || hasError) {
    return null;
  }

  try {
    return (
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ willChange: 'transform' }}>
        <Canvas 
          camera={{ position: [0, 0, 3], fov: 50 }}
          dpr={[1, 1.5]} // Limit pixel ratio for better performance
          gl={{ antialias: false, alpha: true }} // Disable antialiasing for performance
          performance={{ min: 0.5 }} // Lower performance threshold
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <Orb />
        </Canvas>
      </div>
    );
  } catch (error) {
    console.warn('[AgentOrb] Error rendering orb:', error);
    return null;
  }
}
