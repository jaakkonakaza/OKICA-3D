import app from './index.js';
import { serve } from '@hono/node-server';

const port = process.env.PORT ? Number.parseInt(process.env.PORT) : 3001;

console.log(`Server is running on port ${port}`);

serve({
	fetch: app.fetch,
	port
});
