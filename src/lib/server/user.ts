// The trusted authentication proxy supplies the username. devUser is for local development.
export function getUser(headers: Headers, devUser?: string): string | null {
	const header = headers.get('x-auth-request-preferred-username')?.trim();
	if (header) return header;
	return devUser === '' ? null : (devUser ?? null);
}
