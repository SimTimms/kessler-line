import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ChaseViewScissorPassProps {
  /** DOM element that defines the chase PIP viewport (CRT area inside the HUD bezel). */
  track: HTMLElement | null;
  chaseCamera: RefObject<THREE.PerspectiveCamera | null>;
  /**
   * Priority > 0 takes over R3F auto-render — this pass must draw the main
   * (default) camera AND the chase PIP every frame.
   */
  framePriority?: number;
  /** Film-grain strength for the exterior HUD (0–1). */
  grainAmount?: number;
}

const MAX_RT = 512;

const CHASE_HUD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Full grayscale + animated grain — CRT exterior-cam look. */
const CHASE_HUD_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uGrain;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 tex = texture2D(tDiffuse, vUv);
  float luma = dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722));
  float n = hash(vUv * vec2(1920.0, 1080.0) + uTime * 60.0) - 0.5;
  float g = luma + n * uGrain;
  gl_FragColor = vec4(vec3(g), 1.0);
}
`;

/**
 * Dual-camera render: full-screen FPV + chase HUD scissor pass.
 * Chase feed is rendered to an RT then blitted with saturation 0 + grain.
 */
export default function ChaseViewScissorPass({
  track,
  chaseCamera,
  framePriority = 1,
  grainAmount = 0.22,
}: ChaseViewScissorPassProps) {
  const { gl, scene, camera, size } = useThree();

  const { rt, blitScene, blitCam, blitMat } = useMemo(() => {
    const renderTarget = new THREE.WebGLRenderTarget(MAX_RT, MAX_RT, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    renderTarget.texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: renderTarget.texture },
        uTime: { value: 0 },
        uGrain: { value: grainAmount },
      },
      vertexShader: CHASE_HUD_VERT,
      fragmentShader: CHASE_HUD_FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const overlayScene = new THREE.Scene();
    overlayScene.add(quad);
    const overlayCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { rt: renderTarget, blitScene: overlayScene, blitCam: overlayCam, blitMat: mat };
  }, [grainAmount]);

  useEffect(() => {
    return () => {
      rt.dispose();
      blitMat.dispose();
      const mesh = blitScene.children[0] as THREE.Mesh | undefined;
      mesh?.geometry.dispose();
    };
  }, [rt, blitMat, blitScene]);

  useFrame((state) => {
    const w = size.width;
    const h = size.height;

    // ── Main FPV view (full canvas) ──────────────────────────────────────
    gl.autoClear = true;
    gl.setScissorTest(false);
    gl.setRenderTarget(null);
    gl.setViewport(0, 0, w, h);
    gl.clear(true, true, true);
    gl.render(scene, camera);

    // ── Chase PIP: render → desaturate + grain → scissor blit ────────────
    const cam = chaseCamera.current;
    if (!cam || !track) return;

    const trackRect = track.getBoundingClientRect();
    if (trackRect.width < 2 || trackRect.height < 2) return;

    const canvasBottom = size.top + size.height;
    const left = trackRect.left - size.left;
    const bottom = canvasBottom - trackRect.bottom;
    const width = trackRect.width;
    const height = trackRect.height;

    const aspect = width / height;
    if (Math.abs(cam.aspect - aspect) > 1e-4) {
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
    }

    const dpr = gl.getPixelRatio();
    const rtW = Math.min(MAX_RT, Math.max(64, Math.round(width * dpr)));
    const rtH = Math.min(MAX_RT, Math.max(64, Math.round(height * dpr)));
    if (rt.width !== rtW || rt.height !== rtH) {
      rt.setSize(rtW, rtH);
    }

    gl.setRenderTarget(rt);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, rtW, rtH);
    gl.clear(true, true, true);
    gl.render(scene, cam);
    gl.setRenderTarget(null);

    blitMat.uniforms.uTime.value = state.clock.elapsedTime;
    blitMat.uniforms.uGrain.value = grainAmount;
    blitMat.uniforms.tDiffuse.value = rt.texture;

    gl.autoClear = false;
    gl.setViewport(left, bottom, width, height);
    gl.setScissor(left, bottom, width, height);
    gl.setScissorTest(true);
    gl.clear(true, true, true);
    gl.render(blitScene, blitCam);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, w, h);
    gl.autoClear = true;
  }, framePriority);

  return null;
}
