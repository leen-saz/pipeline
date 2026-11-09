// POST /api/request: the request form (src/lib/requests-api.ts does the work)
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { submitRequest } from '../../lib/requests-api';

export const prerender = false;
export const POST: APIRoute = ({ request }) => submitRequest(request, env);
