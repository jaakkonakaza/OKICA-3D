import { expect, it, vi } from 'vitest';
import { Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Texture } from 'three';
import { usePrecompile } from './precompile.svelte';

const scheduler = vi.hoisted(() => ({
	frame: undefined as (() => void) | undefined,
	running: undefined as (() => boolean) | undefined
}));
vi.mock('@threlte/core', () => ({
	useTask: (frame: () => void, options: { running: () => boolean }) => {
		scheduler.frame = frame;
		scheduler.running = options.running;
	},
	useThrelte: () => context
}));

const context = {
	renderer: { initTexture: vi.fn(), compileAsync: vi.fn().mockResolvedValue(undefined) },
	scene: new Scene(),
	camera: { current: new PerspectiveCamera() }
};

it('waits for the object and environment, then stops the precompilation task', () => {
	const target: { mesh?: Mesh } = {};
	usePrecompile(() => target.mesh);
	scheduler.frame?.();
	expect(scheduler.running?.()).toBe(true);

	const map = new Texture();
	target.mesh = new Mesh(undefined, new MeshStandardMaterial({ map }));
	scheduler.frame?.();
	expect(scheduler.running?.()).toBe(true);

	context.scene.environment = new Texture();
	scheduler.frame?.();
	expect(scheduler.running?.()).toBe(false);
	expect(context.renderer.initTexture).toHaveBeenCalledExactlyOnceWith(map);
	expect(context.renderer.compileAsync).toHaveBeenCalledExactlyOnceWith(
		target.mesh,
		context.camera.current,
		context.scene
	);
});
