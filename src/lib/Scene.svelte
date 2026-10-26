<script lang="ts">
	import { T, useLoader, useTask, useThrelte } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import { onDestroy, untrack } from 'svelte';
	import { EquirectangularReflectionMapping, MathUtils, TextureLoader, Vector3 } from 'three';
	import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import skyUrl from './assets/sky.webp';
	import Card from './Card.svelte';
	import { CAMERA_DISTANCE, CAMERA_FOV, START_SCALE } from './layout';
	import Text from './Text.svelte';
	import type { Data } from './types';

	let {
		data,
		isDragging,
		onreadychange
	}: {
		data?: Data;
		isDragging: boolean;
		onreadychange?: (ready: boolean) => void;
	} = $props();

	const scale = new Spring(START_SCALE);

	// Hold the starting pose until the card replaces the skeleton.
	let cardReady = $state(false);
	const onCardReady = () => {
		cardReady = true;
		if (orbitControls) configureControls(orbitControls);
		onreadychange?.(true);
	};

	onDestroy(() => {
		onreadychange?.(false);
	});

	let orbitControls: ThreeOrbitControls | undefined = $state();

	// OrbitControls speed 1 = one turn per minute.
	const IDLE_SPEED = 20;

	const SPIN_IN = 0.8;

	const SPIN_IN_MAX_STEP = 1 / 30;
	const BURST_SPEED = 1600;
	const BURST_END = 0.3;
	const SLOWDOWN_SPEED = 100;
	const SLOWDOWN_END = 0.5;
	const MIN = 0.001;
	const MAX = 100;
	const K = 60;
	const FLIP_THRESHOLD = 20;

	const normalize = (a: number) => MathUtils.euclideanModulo(a + Math.PI, 2 * Math.PI) - Math.PI;

	let lastRemaining = 0;
	let resetSpin = false;
	let speed = BURST_SPEED;
	let dir = 1;
	let rotatedTime = 0;
	let spinIn = 0;

	const SPRING_K = 500;
	const DAMPING = 10;
	// Substeps keep the spring stable during long frames.
	const MAX_STEP = 1 / 240;
	const STOP_VEL = 0.002;
	const TARGET_EPS = 0.002;

	const velocity = new Vector3();

	const ENV_FADE = 0.8;
	// The step is capped to account for reflection map compilation during the first frame.
	const ENV_FADE_MAX_STEP = 1 / 30;
	const { scene } = useThrelte();
	scene.environmentIntensity = 0;

	const sky = useLoader(TextureLoader).load(skyUrl, {
		transform: (texture) => {
			texture.mapping = EquirectangularReflectionMapping;
			return texture;
		}
	});
	const skyError = sky.error;
	$effect(() => {
		if ($skyError) throw new Error('Environment failed to load', { cause: $skyError });
		if (!$sky) return;
		scene.environment = $sky;
		return () => {
			scene.environment = null;
		};
	});
	let envFade = 0;
	let envFading = $state(true);
	useTask(
		(dt) => {
			if (!scene.environment) return;
			envFade = Math.min(1, envFade + Math.min(dt, ENV_FADE_MAX_STEP) / ENV_FADE);
			scene.environmentIntensity = MathUtils.smoothstep(envFade, 0, 1);
			if (envFade === 1) envFading = false;
		},
		{ running: () => envFading }
	);

	const configureControls = (controls: ThreeOrbitControls) => {
		// Threlte props trigger a separate update() without dt.
		controls.enableDamping = true;
		controls.dampingFactor = 0.1;
		controls.enabled = cardReady;
		controls.autoRotate = cardReady && !prefersReducedMotion.current;
		if (!resetSpin) controls.autoRotateSpeed = IDLE_SPEED * MathUtils.smoothstep(spinIn, 0, 1);
	};

	const easeInSpin = (controls: ThreeOrbitControls, dt: number) => {
		spinIn = Math.min(1, spinIn + Math.min(dt, SPIN_IN_MAX_STEP) / SPIN_IN);
		controls.autoRotateSpeed = IDLE_SPEED * MathUtils.smoothstep(spinIn, 0, 1);
	};

	$effect(() => {
		if (orbitControls) configureControls(orbitControls);
	});

	const spinDown = (controls: ThreeOrbitControls, dt: number) => {
		rotatedTime += dt;

		if (rotatedTime > BURST_END && rotatedTime < SLOWDOWN_END) {
			controls.autoRotateSpeed = SLOWDOWN_SPEED;
		}
		if (rotatedTime < SLOWDOWN_END) return;

		const remaining = normalize(controls.getAzimuthalAngle());
		const crossedZero = Math.sign(remaining) !== Math.sign(lastRemaining);
		const crawling = Math.abs(speed) < FLIP_THRESHOLD;

		if (crossedZero && crawling) {
			dir = Math.sign(remaining) || 1;
		}

		speed = MathUtils.clamp(Math.abs(remaining) * K, MIN, MAX);
		controls.autoRotateSpeed = speed * dir;
		lastRemaining = remaining;
	};

	const settleTarget = (controls: ThreeOrbitControls, dt: number) => {
		const pos = controls.target;

		if (isDragging) {
			velocity.set(0, 0, 0);
			return;
		}

		const steps = Math.ceil(dt / MAX_STEP);
		const h = dt / steps;
		for (let i = 0; i < steps; i++) {
			velocity.multiplyScalar(1 - DAMPING * h).addScaledVector(pos, -SPRING_K * h);
			pos.addScaledVector(velocity, h);
		}

		if (velocity.lengthSq() < STOP_VEL * STOP_VEL && pos.lengthSq() < TARGET_EPS * TARGET_EPS) {
			pos.set(0, 0, 0);
			velocity.set(0, 0, 0);
		}
	};

	useTask((dt) => {
		if (!orbitControls) return;
		if (!prefersReducedMotion.current && resetSpin) spinDown(orbitControls, dt);
		else if (!prefersReducedMotion.current && cardReady && spinIn < 1)
			easeInSpin(orbitControls, dt);
		settleTarget(orbitControls, dt);
		orbitControls.update(dt);
	});

	$effect(() => {
		if (!data || !cardReady) return;
		untrack(() => {
			rotatedTime = 0;
			speed = BURST_SPEED;
			dir = 1;
			lastRemaining = 0;
			if (orbitControls) orbitControls.autoRotateSpeed = BURST_SPEED;
			resetSpin = true;

			void scale.set(1, { instant: prefersReducedMotion.current });
		});
	});
</script>

<T.PerspectiveCamera makeDefault fov={CAMERA_FOV} position={[0, 0, CAMERA_DISTANCE]}>
	<OrbitControls
		bind:ref={orbitControls}
		minDistance={CAMERA_DISTANCE}
		maxDistance={CAMERA_DISTANCE}
		rotateSpeed={3}
		enableZoom={false}
		maxPolarAngle={Math.PI / 2}
		minPolarAngle={Math.PI / 2}
	/>
</T.PerspectiveCamera>
<T.DirectionalLight position={[0, 10, 10]} intensity={2} />
<T.Group scale={scale.current}>
	<Card loaded={!!data} onready={onCardReady} />
	<Text {data} />
</T.Group>
