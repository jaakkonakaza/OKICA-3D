declare global {
	namespace App {
		interface Locals {
			/** Pocket ID username from the authentication proxy. */
			user: string | null;
		}
	}
}

export {};
