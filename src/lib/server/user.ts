// Remote-User comes from the trusted authentication proxy. devUser is for local development.
export function getUser(headers: Headers, devUser?: string): string | null {
	const header = headers.get('remote-user')?.trim();
	if (header) return header;
	return devUser === '' ? null : (devUser ?? null);
}
