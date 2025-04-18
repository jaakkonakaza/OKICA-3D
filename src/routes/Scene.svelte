<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { Environment, interactivity, OrbitControls } from '@threlte/extras';
	import { Spring } from 'svelte/motion';
	import Card from './Card.svelte';
	import Text from './Text.svelte';
	import type { Data } from './types';
	import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { Vector3, MathUtils } from 'three';

	let { isDragging } = $props();

	interactivity();
	const scale = new Spring(0.7);

	let orbitControls: ThreeOrbitControls | undefined = $state();

	/* ---------- spin constants ---------- */
	const MIN = 0.001;
	const MAX = 50;
	const K = 30;
	const FLIP_THRESHOLD = 10;

	const normalize = (a: number) => ((a + Math.PI) % (2 * Math.PI)) - Math.PI;

	let lastRemaining = $state(0);
	let resetSpin = $state(false);
	let speed = $state(800);
	let dir = $state(1);
	let rotatedTime = $state(0);

	/* ---------- target spring constants ---------- */
	const SPRING_K = 500;
	const DAMPING = 10;
	const STOP_VEL = 0.002;
	const TARGET_EPS = 0.002;

	let velocity = $state(new Vector3());

	/* ---------- camera spin ---------- */
	useTask((dt) => {
		if (!resetSpin || !orbitControls) return;
		rotatedTime += dt;

		if (rotatedTime > 0.3 && rotatedTime < 0.5) orbitControls.autoRotateSpeed = 50;
		if (rotatedTime < 0.5) return;

		const remaining = normalize(orbitControls.getAzimuthalAngle());
		const absRem = Math.abs(remaining);

		const crossedZero = Math.sign(remaining) !== Math.sign(lastRemaining);
		const crawling = Math.abs(speed) < FLIP_THRESHOLD;

		if (crossedZero && crawling) {
			dir = Math.sign(remaining) || 1;
			speed = MIN;
		}

		speed = MathUtils.clamp(absRem * K, MIN, MAX);
		orbitControls.autoRotateSpeed = speed * dir;
		lastRemaining = remaining;
	});

	/* ---------- damped settle‑to‑origin ---------- */
	useTask((dt) => {
		if (!orbitControls || !orbitControls.target) return;
		if (isDragging) return;

		const pos = orbitControls.target;

		const accel = pos
			.clone()
			.multiplyScalar(-SPRING_K)
			.add(velocity.clone().multiplyScalar(-DAMPING));

		velocity.addScaledVector(accel, dt);
		pos.addScaledVector(velocity, dt);

		if (velocity.lengthSq() < STOP_VEL * STOP_VEL && pos.lengthSq() < TARGET_EPS * TARGET_EPS) {
			pos.set(0, 0, 0);
			velocity.set(0, 0, 0);
		}

		orbitControls.update();
	});

	let textComponent: Text;
	let cardComponent: Card;

	export const load = (data: Data) => {
		textComponent.load(data);
		cardComponent.load();

		if (!orbitControls) return;
		orbitControls.autoRotate = true;
		orbitControls.autoRotateSpeed = speed;

		const startDir = orbitControls.target.clone().normalize();
		const startMag = orbitControls.target.length();
		velocity.copy(startDir).multiplyScalar(Math.sqrt(SPRING_K) * startMag);

		resetSpin = true;
		scale.set(1);
		return '';
	};
</script>

<T.PerspectiveCamera makeDefault position={[0, 5, 0]}>
	<OrbitControls
		bind:ref={orbitControls}
		minDistance={5}
		maxDistance={5}
		enableDamping
		dampingFactor={0.1}
		rotateSpeed={3}
		autoRotate={true}
		autoRotateSpeed={10}
		enableZoom={false}
		maxPolarAngle={Math.PI / 2}
		minPolarAngle={Math.PI / 2}
	/>
</T.PerspectiveCamera>
<ambientLight intensity={Math.PI}></ambientLight>
<T.DirectionalLight position={[0, 10, 10]} intensity={2} />
<Environment isBackground={false} url="sky4k.jpg" />
<T.Group scale={scale.current}>
	<T.Mesh>
		<Card bind:this={cardComponent} />
	</T.Mesh>
	<Text bind:this={textComponent} />
</T.Group>
