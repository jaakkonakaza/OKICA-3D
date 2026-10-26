import { useTask, useThrelte } from '@threlte/core';
import { Mesh, MeshStandardMaterial, type Object3D } from 'three';

// Hidden materials compile before the data arrives. The environment selects the shader variant.
export function usePrecompile(object: () => Object3D | undefined) {
	const { renderer, scene, camera } = useThrelte();

	let running = $state(true);

	useTask(
		() => {
			const target = object();
			if (!target || !scene.environment) return;
			running = false;

			target.traverse((child) => {
				if (!(child instanceof Mesh) || !(child.material instanceof MeshStandardMaterial)) return;
				const m = child.material;
				for (const texture of [m.map, m.metalnessMap, m.roughnessMap, m.normalMap, m.emissiveMap]) {
					if (texture) renderer.initTexture(texture);
				}
			});
			void renderer.compileAsync(target, camera.current, scene).catch((error: unknown) => {
				console.warn('Shader precompilation failed; rendering will compile on demand', error);
			});
		},
		{ autoInvalidate: false, running: () => running }
	);
}
