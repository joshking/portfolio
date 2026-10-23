"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "@/app/lab/animated-headshot/animated-headshot.module.css";

const PORTRAIT_SRC = "/images/lab/particle-headshot/me.png";
const MOBILE_BREAKPOINT = 700;

type ParticleShape = "square" | "circle" | "diamond" | "dash";

type ParticleSettings = {
  zoom: number;
  verticalCrop: number;
  trace: number;
  contrast: number;
  featureDetail: number;
  coherence: number;
  spacing: number;
  size: number;
  shape: ParticleShape;
  speed: number;
  travel: number;
  chaos: number;
  drift: number;
  hoverForce: number;
  hoverRadius: number;
  returnSpeed: number;
  glow: number;
};

const SHAPE_VALUES: Record<ParticleShape, number> = {
  square: 0,
  circle: 1,
  diamond: 2,
  dash: 3,
};

const PRESETS: Array<{ name: string; settings: ParticleSettings }> = [
  {
    name: "Portrait",
    settings: {
      zoom: 1.3,
      verticalCrop: -0.12,
      trace: 0,
      contrast: 1.65,
      featureDetail: 1.5,
      coherence: 0.42,
      spacing: 1,
      size: 1,
      shape: "square",
      speed: 0.5,
      travel: 1.08,
      chaos: 0.2,
      drift: 0.1,
      hoverForce: 0.36,
      hoverRadius: 0.3,
      returnSpeed: 0.065,
      glow: 0.8,
    },
  },
  {
    name: "Field",
    settings: {
      zoom: 1.08,
      verticalCrop: -0.03,
      trace: 0.025,
      contrast: 1.1,
      featureDetail: 0.7,
      coherence: 0.2,
      spacing: 2,
      size: 1,
      shape: "square",
      speed: 1,
      travel: 1.1,
      chaos: 0.38,
      drift: 0.18,
      hoverForce: 0.92,
      hoverRadius: 0.38,
      returnSpeed: 0.055,
      glow: 0.95,
    },
  },
  {
    name: "Dissolve",
    settings: {
      zoom: 1.18,
      verticalCrop: -0.08,
      trace: 0,
      contrast: 1.7,
      featureDetail: 1.45,
      coherence: 0.04,
      spacing: 3,
      size: 1.3,
      shape: "diamond",
      speed: 1.4,
      travel: 1.34,
      chaos: 0.82,
      drift: 0.58,
      hoverForce: 1.24,
      hoverRadius: 0.48,
      returnSpeed: 0.035,
      glow: 1.2,
    },
  },
];

const DEFAULT_SETTINGS = PRESETS[0].settings;

const vertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uReducedMotion;
  uniform float uPortraitScale;
  uniform float uPortraitOffsetY;
  uniform float uSpacing;
  uniform float uPointSize;
  uniform float uChaos;
  uniform float uTravel;
  uniform float uDrift;
  uniform float uHoverForce;
  uniform float uHoverRadius;
  uniform float uGlow;
  uniform float uContrast;
  uniform float uFeatureDetail;
  uniform float uCoherence;

  attribute vec3 aTarget;
  attribute vec3 aSpawn;
  attribute vec2 aGrid;
  attribute float aSeed;
  attribute float aBrightness;
  attribute float aEdge;
  attribute float aSize;

  varying float vAlpha;
  varying float vBrightness;
  varying float vHover;
  varying float vSeed;

  void main() {
    float simulationTime = mix(uTime, 7.0, uReducedMotion);
    float speedVariation = mix(0.052, 0.052 + aSeed * 0.034, uChaos);
    float phase = fract(aSeed * 1.731 + aTarget.x * 0.19 + aTarget.y * 0.13);
    float cycle = fract(simulationTime * speedVariation + phase);
    float arriving = smoothstep(0.02, 0.34, cycle);
    arriving = 1.0 - pow(1.0 - arriving, 3.0);

    vec2 targetPoint = vec2(
      aTarget.x * uPortraitScale,
      aTarget.y * uPortraitScale + uPortraitOffsetY
    );
    vec2 orderedDirection = normalize(aSpawn.xy + vec2(0.0001));
    float spawnRadius = mix(1.24, length(aSpawn.xy), uChaos) * uTravel;
    vec3 spawnPoint = vec3(orderedDirection * spawnRadius, aSpawn.z);
    vec2 targetScatter = vec2(cos(aSeed * 73.0), sin(aSeed * 91.0)) * 0.009 * uChaos;
    vec3 targetPosition = vec3(targetPoint + targetScatter, aTarget.z);
    vec3 particlePosition = mix(spawnPoint, targetPosition, arriving);

    vec2 ambientDrift = vec2(
      sin(simulationTime * 1.1 + aSeed * 43.0),
      cos(simulationTime * 0.92 + aSeed * 37.0)
    ) * 0.009 * uDrift * arriving;
    particlePosition.xy += ambientDrift;

    if (uReducedMotion > 0.5) {
      particlePosition = targetPosition;
      arriving = 1.0;
    }

    float pointerDistance = distance(particlePosition.xy, uPointer);
    float hover = smoothstep(uHoverRadius, 0.0, pointerDistance) * uPointerStrength;
    vec2 away = normalize(particlePosition.xy - uPointer + vec2(0.0001));
    float jitter = sin(simulationTime * 3.7 + aSeed * 31.0);
    vec2 hoverDrift = vec2(cos(aSeed * 41.0), sin(aSeed * 37.0));
    float disturbance = 0.018 + uHoverForce * 0.072;
    particlePosition.xy +=
      (away * (disturbance + jitter * 0.018 * uChaos) + hoverDrift * 0.02 * uChaos) *
      hover *
      (1.0 - uReducedMotion);

    float fadeIn = smoothstep(0.04, 0.3, cycle);
    float fadeOutStart = mix(0.64, 0.88, uCoherence);
    float fadeOut = 1.0 - smoothstep(fadeOutStart, 1.0, cycle);
    float cycleAlpha = fadeIn * fadeOut;
    if (uReducedMotion > 0.5) {
      cycleAlpha = 1.0;
    }

    float spacing = floor(uSpacing + 0.5);
    float gridVisible = step(mod(aGrid.x, spacing), 0.1) * step(mod(aGrid.y, spacing), 0.1);
    float inFrame = step(abs(particlePosition.x), 1.04) * step(abs(particlePosition.y), 1.04);
    float tonalBrightness = clamp((aBrightness - 0.5) * uContrast + 0.5, 0.0, 1.0);
    float featureBrightness = clamp(max(tonalBrightness * 0.86, aEdge * uFeatureDetail), 0.0, 1.0);
    float approachLight = 0.035 + pow(arriving, 1.7) * 0.965;

    vAlpha =
      cycleAlpha *
      approachLight *
      (0.05 + pow(featureBrightness, 0.9) * 1.18) *
      gridVisible *
      inFrame;
    vBrightness = featureBrightness;
    vHover = hover * uGlow;
    vSeed = aSeed;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(particlePosition, 1.0);
    gl_PointSize = (0.72 + aSize * 1.2 + hover * 0.72 * uGlow) * uPointSize * uPixelRatio;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uShape;
  uniform float uGlow;

  varying float vAlpha;
  varying float vBrightness;
  varying float vHover;
  varying float vSeed;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    vec2 absolutePoint = abs(point);
    float squareEdge = 1.0 - smoothstep(0.42, 0.5, max(absolutePoint.x, absolutePoint.y));
    float circleEdge = 1.0 - smoothstep(0.42, 0.5, length(point));
    float diamondEdge = 1.0 - smoothstep(0.42, 0.5, absolutePoint.x + absolutePoint.y);
    float dashEdge =
      (1.0 - smoothstep(0.1, 0.18, absolutePoint.y)) *
      (1.0 - smoothstep(0.42, 0.5, absolutePoint.x));

    float shapeEdge = squareEdge;
    if (uShape > 0.5 && uShape < 1.5) shapeEdge = circleEdge;
    if (uShape > 1.5 && uShape < 2.5) shapeEdge = diamondEdge;
    if (uShape > 2.5) shapeEdge = dashEdge;

    vec3 deepGreen = vec3(0.008, 0.4, 0.08);
    vec3 portraitGreen = vec3(0.025, 0.94, 0.25);
    vec3 luminousGreen = vec3(0.48, 1.0, 0.62);
    float light = clamp(vBrightness * (0.7 + uGlow * 0.12) + vHover * 0.72, 0.0, 1.0);
    vec3 color = mix(deepGreen, portraitGreen, smoothstep(0.08, 0.68, light));
    color = mix(color, luminousGreen, smoothstep(0.7, 1.0, light));
    float microVariation = mix(0.86, 1.08, fract(vSeed * 17.0));
    gl_FragColor = vec4(color * microVariation, vAlpha * shapeEdge * (0.66 + uGlow * 0.28));
  }
`;

type ParticleData = {
  targets: Float32Array;
  spawns: Float32Array;
  grid: Float32Array;
  seeds: Float32Array;
  brightness: Float32Array;
  edges: Float32Array;
  sizes: Float32Array;
};

function deterministicNoise(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildParticleData(image: HTMLImageElement): ParticleData {
  const sampleSize = window.innerWidth <= MOBILE_BREAKPOINT ? 216 : 272;
  const offscreen = document.createElement("canvas");
  offscreen.width = sampleSize;
  offscreen.height = sampleSize;
  const context = offscreen.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas sampling is unavailable.");
  }

  const scale = Math.max(sampleSize / image.naturalWidth, sampleSize / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.clearRect(0, 0, sampleSize, sampleSize);
  context.drawImage(image, (sampleSize - width) / 2, (sampleSize - height) / 2, width, height);

  const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
  const targetValues: number[] = [];
  const spawnValues: number[] = [];
  const gridValues: number[] = [];
  const seedValues: number[] = [];
  const brightnessValues: number[] = [];
  const edgeValues: number[] = [];
  const sizeValues: number[] = [];

  for (let y = 0; y < sampleSize; y += 1) {
    for (let x = 0; x < sampleSize; x += 1) {
      const pixelIndex = (y * sampleSize + x) * 4;
      const alpha = pixels[pixelIndex + 3] / 255;
      if (alpha < 0.12) continue;

      const red = pixels[pixelIndex] / 255;
      const green = pixels[pixelIndex + 1] / 255;
      const blue = pixels[pixelIndex + 2] / 255;
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      const sampleLuminance = (sampleX: number, sampleY: number) => {
        const clampedX = Math.max(0, Math.min(sampleSize - 1, sampleX));
        const clampedY = Math.max(0, Math.min(sampleSize - 1, sampleY));
        const index = (clampedY * sampleSize + clampedX) * 4;
        return (
          (pixels[index] / 255) * 0.2126 +
          (pixels[index + 1] / 255) * 0.7152 +
          (pixels[index + 2] / 255) * 0.0722
        );
      };
      const horizontalEdge = Math.abs(sampleLuminance(x + 1, y) - sampleLuminance(x - 1, y));
      const verticalEdge = Math.abs(sampleLuminance(x, y + 1) - sampleLuminance(x, y - 1));
      const edge = Math.min(1, (horizontalEdge + verticalEdge) * 2.25);
      const seed = deterministicNoise(x + 17, y + 43);
      const alphaAt = (sampleX: number, sampleY: number) => {
        const clampedX = Math.max(0, Math.min(sampleSize - 1, sampleX));
        const clampedY = Math.max(0, Math.min(sampleSize - 1, sampleY));
        return pixels[(clampedY * sampleSize + clampedX) * 4 + 3] / 255;
      };
      const silhouetteEdge = 1 - Math.min(
        alphaAt(x - 3, y),
        alphaAt(x + 3, y),
        alphaAt(x, y - 3),
        alphaAt(x, y + 3),
      );
      const clusterNoise = deterministicNoise(Math.floor(x / 7) + 311, Math.floor(y / 7) + 127);
      const rowNoise = deterministicNoise(Math.floor(y / 3) + 59, Math.floor(x / 19) + 83);
      const density = clamp01(
        0.22 +
          Math.pow(luminance, 0.72) * 0.24 +
          edge * 0.34 +
          silhouetteEdge * 0.12 +
          (clusterNoise - 0.5) * 0.32 +
          (rowNoise - 0.5) * 0.12,
      );
      if (deterministicNoise(x + 701, y + 907) > density) continue;

      const angle = deterministicNoise(x + 101, y + 79) * Math.PI * 2;
      const radius = 1.18 + deterministicNoise(x + 211, y + 13) * 0.62;
      const targetX = ((x / (sampleSize - 1)) * 2 - 1) * 0.93;
      const targetY = (1 - (y / (sampleSize - 1)) * 2) * 0.93;

      targetValues.push(targetX, targetY, seed * 0.025);
      spawnValues.push(Math.cos(angle) * radius, Math.sin(angle) * radius, seed * 0.08);
      gridValues.push(x, y);
      seedValues.push(seed);
      const directionalLight = 0.48 + (x / (sampleSize - 1)) * 0.78;
      const mappedLuminance = clamp01(luminance * directionalLight);
      brightnessValues.push(Math.min(1, 0.04 + Math.pow(mappedLuminance, 0.8) * 0.98));
      edgeValues.push(edge);
      sizeValues.push(0.34 + deterministicNoise(x + 7, y + 5) * 0.68);
    }
  }

  return {
    targets: new Float32Array(targetValues),
    spawns: new Float32Array(spawnValues),
    grid: new Float32Array(gridValues),
    seeds: new Float32Array(seedValues),
    brightness: new Float32Array(brightnessValues),
    edges: new Float32Array(edgeValues),
    sizes: new Float32Array(sizeValues),
  };
}

type RangeControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

function RangeControl({ label, value, min, max, step, display, disabled = false, onChange }: RangeControlProps) {
  return (
    <label className={`${styles.rangeControl} ${disabled ? styles.controlDisabled : ""}`}>
      <span className={styles.controlLabel}>
        <span>{label}</span>
        <output>{display}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export function AnimatedHeadshot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef(new THREE.Vector2(4, 4));
  const pointerStrengthRef = useRef(0);
  const pointerTargetRef = useRef(0);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const pausedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const [renderState, setRenderState] = useState<"loading" | "ready" | "fallback">("loading");
  const [settings, setSettings] = useState<ParticleSettings>(DEFAULT_SETTINGS);
  const [activePreset, setActivePreset] = useState(PRESETS[0].name);
  const [paused, setPaused] = useState(false);
  const [motionReduced, setMotionReduced] = useState(false);
  const [particleCapacity, setParticleCapacity] = useState(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      reducedMotionRef.current = mediaQuery.matches;
      setMotionReduced(mediaQuery.matches);
      if (mediaQuery.matches) setPaused(false);
    };

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let points: THREE.Points | null = null;
    let animationFrame = 0;
    let fallbackTimer = 0;
    let disposed = false;
    let isVisible = true;
    const timer = new THREE.Timer();
    timer.connect(document);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.12, 1.12, 1.12, -1.12, 0.1, 10);
    camera.position.z = 2;

    const uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uPointer: { value: pointerRef.current },
      uPointerStrength: { value: 0 },
      uReducedMotion: { value: reducedMotionRef.current ? 1 : 0 },
      uPortraitScale: { value: DEFAULT_SETTINGS.zoom },
      uPortraitOffsetY: { value: DEFAULT_SETTINGS.verticalCrop },
      uSpacing: { value: DEFAULT_SETTINGS.spacing },
      uPointSize: { value: DEFAULT_SETTINGS.size },
      uChaos: { value: DEFAULT_SETTINGS.chaos },
      uTravel: { value: DEFAULT_SETTINGS.travel },
      uDrift: { value: DEFAULT_SETTINGS.drift },
      uHoverForce: { value: DEFAULT_SETTINGS.hoverForce },
      uHoverRadius: { value: DEFAULT_SETTINGS.hoverRadius },
      uGlow: { value: DEFAULT_SETTINGS.glow },
      uContrast: { value: DEFAULT_SETTINGS.contrast },
      uFeatureDetail: { value: DEFAULT_SETTINGS.featureDetail },
      uCoherence: { value: DEFAULT_SETTINGS.coherence },
      uShape: { value: SHAPE_VALUES[DEFAULT_SETTINGS.shape] },
    };

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch {
      fallbackTimer = window.setTimeout(() => setRenderState("fallback"), 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    const resize = () => {
      if (!renderer) return;
      const size = Math.max(1, frame.clientWidth);
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(size, size, false);
      uniforms.uPixelRatio.value = pixelRatio;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frame);
    resize();

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (!isVisible) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        } else if (!document.hidden && animationFrame === 0) {
          timer.reset();
          animationFrame = window.requestAnimationFrame(render);
        }
      },
      { threshold: 0.02 },
    );
    intersectionObserver.observe(frame);

    const handleVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else if (isVisible && animationFrame === 0) {
        timer.reset();
        animationFrame = window.requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const image = new window.Image();
    image.decoding = "async";
    image.src = PORTRAIT_SRC;

    image.onload = () => {
      if (disposed || !renderer) return;

      try {
        const data = buildParticleData(image);
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(data.targets, 3));
        geometry.setAttribute("aTarget", new THREE.BufferAttribute(data.targets, 3));
        geometry.setAttribute("aSpawn", new THREE.BufferAttribute(data.spawns, 3));
        geometry.setAttribute("aGrid", new THREE.BufferAttribute(data.grid, 2));
        geometry.setAttribute("aSeed", new THREE.BufferAttribute(data.seeds, 1));
        geometry.setAttribute("aBrightness", new THREE.BufferAttribute(data.brightness, 1));
        geometry.setAttribute("aEdge", new THREE.BufferAttribute(data.edges, 1));
        geometry.setAttribute("aSize", new THREE.BufferAttribute(data.sizes, 1));

        material = new THREE.ShaderMaterial({
          uniforms,
          vertexShader,
          fragmentShader,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        points = new THREE.Points(geometry, material);
        scene.add(points);
        setParticleCapacity(data.seeds.length);
        setRenderState("ready");
      } catch {
        setRenderState("fallback");
      }
    };

    image.onerror = () => {
      if (!disposed) setRenderState("fallback");
    };

    function render(timestamp?: number) {
      if (disposed || !isVisible || document.hidden) {
        animationFrame = 0;
        return;
      }
      animationFrame = window.requestAnimationFrame(render);
      if (!renderer || !points) return;

      const current = settingsRef.current;
      const target = pointerTargetRef.current;
      const easing = target > pointerStrengthRef.current ? 0.13 : current.returnSpeed;
      pointerStrengthRef.current += (target - pointerStrengthRef.current) * easing;
      uniforms.uPointerStrength.value = pointerStrengthRef.current;
      uniforms.uReducedMotion.value = reducedMotionRef.current ? 1 : 0;
      uniforms.uPortraitScale.value = current.zoom;
      uniforms.uPortraitOffsetY.value = current.verticalCrop;
      uniforms.uSpacing.value = current.spacing;
      uniforms.uPointSize.value = current.size;
      uniforms.uChaos.value = current.chaos;
      uniforms.uTravel.value = current.travel;
      uniforms.uDrift.value = current.drift;
      uniforms.uHoverForce.value = current.hoverForce;
      uniforms.uHoverRadius.value = current.hoverRadius;
      uniforms.uGlow.value = current.glow;
      uniforms.uContrast.value = current.contrast;
      uniforms.uFeatureDetail.value = current.featureDetail;
      uniforms.uCoherence.value = current.coherence;
      uniforms.uShape.value = SHAPE_VALUES[current.shape];

      if (!reducedMotionRef.current) {
        timer.update(timestamp);
        const delta = Math.min(timer.getDelta(), 0.05);
        if (!pausedRef.current) uniforms.uTime.value += delta * current.speed;
      }
      renderer.render(scene, camera);
    }

    animationFrame = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.clearTimeout(fallbackTimer);
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      timer.dispose();
      if (points) scene.remove(points);
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
    };
  }, []);

  const updateSetting = <Key extends keyof ParticleSettings>(key: Key, value: ParticleSettings[Key]) => {
    setActivePreset("");
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const applyPreset = (name: string, presetSettings: ParticleSettings) => {
    setSettings(presetSettings);
    setActivePreset(name);
    setPaused(false);
  };

  const updatePointer = (clientX: number, clientY: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const bounds = frame.getBoundingClientRect();
    pointerRef.current.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -(((clientY - bounds.top) / bounds.height) * 2 - 1),
    );
    pointerTargetRef.current = 1;
  };

  const activeParticles = Math.round(particleCapacity / Math.pow(settings.spacing, 2));
  const controlsAvailable = renderState !== "fallback";
  const portraitLabel = controlsAvailable
    ? motionReduced
      ? "Green particle portrait of Josh King. Motion is reduced by your system setting; pointer lighting and appearance controls remain available."
      : "Interactive green particle portrait of Josh King. Move across the portrait to light and disturb the particles; they settle back when you leave."
    : "Static green portrait of Josh King. WebGL particle controls are unavailable.";
  const frameStyle = {
    "--portrait-trace": settings.trace,
    "--portrait-zoom": settings.zoom,
    "--portrait-y": `${settings.verticalCrop * -50}%`,
  } as CSSProperties;

  return (
    <div className={styles.headshotTool}>
      <div className={styles.visualColumn}>
        <div
          ref={frameRef}
          className={styles.portraitFrame}
          data-state={renderState}
          style={frameStyle}
          tabIndex={controlsAvailable ? 0 : -1}
          role="img"
          aria-label={portraitLabel}
          onPointerEnter={controlsAvailable ? (event) => updatePointer(event.clientX, event.clientY) : undefined}
          onPointerMove={controlsAvailable ? (event) => updatePointer(event.clientX, event.clientY) : undefined}
          onPointerLeave={() => {
            pointerTargetRef.current = 0;
          }}
          onFocus={() => {
            pointerRef.current.set(0.18, 0.08);
            pointerTargetRef.current = 1;
          }}
          onBlur={() => {
            pointerTargetRef.current = 0;
          }}
        >
          <Image
            className={styles.portraitFallback}
            src={PORTRAIT_SRC}
            alt="Josh King"
            fill
            sizes="(max-width: 1080px) 90vw, 62vw"
            preload
          />
          <canvas ref={canvasRef} className={styles.particleCanvas} aria-hidden="true" />
          <span className={styles.loadingLabel} aria-live="polite">
            {renderState === "loading" ? "Forming portrait" : ""}
          </span>
        </div>

        <div className={styles.stageNotes} aria-hidden="true">
          <span>Form</span>
          <span>Respond</span>
          <span>Return</span>
        </div>
      </div>

      <form
        className={styles.controlPanel}
        aria-label="Particle portrait controls"
        onSubmit={(event) => event.preventDefault()}
      >
        {!controlsAvailable ? (
          <div className={styles.fallbackPanel} role="status">
            <h1>Static portrait</h1>
            <p>WebGL is unavailable, so live particle controls are off. The portrait remains visible.</p>
          </div>
        ) : (
          <>
            <div className={styles.controlHeader}>
              <div>
                <h1>Tune the field</h1>
                <p>{activeParticles ? `≈ ${activeParticles.toLocaleString()} active particles` : "Sampling portrait"}</p>
              </div>
              <button
                className={styles.pauseButton}
                type="button"
                aria-pressed={paused}
                disabled={motionReduced}
                onClick={() => setPaused((current) => !current)}
              >
                {motionReduced ? "Motion reduced" : paused ? "Resume" : "Pause"}
              </button>
            </div>

            {motionReduced ? (
              <p className={styles.motionNotice} role="status">
                Reduced motion is active. Spatial motion controls are locked; appearance and pointer lighting still respond.
              </p>
            ) : null}

            <div className={styles.presetRow} role="group" aria-label="Treatment presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  aria-pressed={activePreset === preset.name}
                  onClick={() => applyPreset(preset.name, preset.settings)}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <div className={styles.controlGroups}>
          <fieldset>
            <legend>Portrait</legend>
            <RangeControl label="Crop" value={settings.zoom} min={0.9} max={1.8} step={0.01} display={`${settings.zoom.toFixed(2)}×`} onChange={(value) => updateSetting("zoom", value)} />
            <RangeControl label="Vertical" value={settings.verticalCrop} min={-0.3} max={0.3} step={0.01} display={`${Math.round(settings.verticalCrop * 100)}%`} onChange={(value) => updateSetting("verticalCrop", value)} />
            <RangeControl label="Image trace" value={settings.trace} min={0} max={0.5} step={0.005} display={`${Math.round(settings.trace * 100)}%`} onChange={(value) => updateSetting("trace", value)} />
            <RangeControl label="Tonal detail" value={settings.contrast} min={0.6} max={2.2} step={0.05} display={`${settings.contrast.toFixed(2)}×`} onChange={(value) => updateSetting("contrast", value)} />
            <RangeControl label="Feature edges" value={settings.featureDetail} min={0} max={2} step={0.05} display={`${settings.featureDetail.toFixed(2)}×`} onChange={(value) => updateSetting("featureDetail", value)} />
            <RangeControl label="Cohesion" value={settings.coherence} min={0} max={1} step={0.01} display={`${Math.round(settings.coherence * 100)}%`} onChange={(value) => updateSetting("coherence", value)} />
          </fieldset>

          <fieldset>
            <legend>Particles</legend>
            <div className={styles.shapeControl}>
              <span>Shape</span>
              <div>
                {(Object.keys(SHAPE_VALUES) as ParticleShape[]).map((shape) => (
                  <button key={shape} type="button" aria-pressed={settings.shape === shape} aria-label={`Use ${shape} particles`} onClick={() => updateSetting("shape", shape)}>
                    <span className={styles[`${shape}Shape`]} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <RangeControl label="Spacing" value={settings.spacing} min={1} max={5} step={1} display={`${settings.spacing}px`} onChange={(value) => updateSetting("spacing", value)} />
            <RangeControl label="Size" value={settings.size} min={0.45} max={1.8} step={0.05} display={`${settings.size.toFixed(2)}×`} onChange={(value) => updateSetting("size", value)} />
            <RangeControl label="Glow" value={settings.glow} min={0.2} max={1.5} step={0.05} display={`${settings.glow.toFixed(2)}×`} onChange={(value) => updateSetting("glow", value)} />
          </fieldset>

          <fieldset>
            <legend>Motion</legend>
            <RangeControl label="Cycle speed" value={settings.speed} min={0.2} max={2} step={0.05} display={`${settings.speed.toFixed(2)}×`} disabled={motionReduced} onChange={(value) => updateSetting("speed", value)} />
            <RangeControl label="Travel" value={settings.travel} min={0.72} max={1.55} step={0.01} display={`${settings.travel.toFixed(2)}×`} disabled={motionReduced} onChange={(value) => updateSetting("travel", value)} />
            <RangeControl label="Chaos" value={settings.chaos} min={0} max={1} step={0.01} display={`${Math.round(settings.chaos * 100)}%`} onChange={(value) => updateSetting("chaos", value)} />
            <RangeControl label="Ambient drift" value={settings.drift} min={0} max={1} step={0.01} display={`${Math.round(settings.drift * 100)}%`} disabled={motionReduced} onChange={(value) => updateSetting("drift", value)} />
          </fieldset>

          <fieldset>
            <legend>Interaction</legend>
            <RangeControl label="Disturbance" value={settings.hoverForce} min={0} max={1.5} step={0.01} display={`${Math.round(settings.hoverForce * 100)}%`} disabled={motionReduced} onChange={(value) => updateSetting("hoverForce", value)} />
            <RangeControl label="Reach" value={settings.hoverRadius} min={0.15} max={0.65} step={0.01} display={`${Math.round(settings.hoverRadius * 100)}%`} onChange={(value) => updateSetting("hoverRadius", value)} />
            <RangeControl label="Settle speed" value={settings.returnSpeed} min={0.02} max={0.2} step={0.005} display={`${Math.round(settings.returnSpeed * 100)}%`} onChange={(value) => updateSetting("returnSpeed", value)} />
          </fieldset>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
