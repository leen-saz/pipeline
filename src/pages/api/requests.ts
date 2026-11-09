// /api/requests: the inbox's list, status change and delete. src/middleware.ts lets only the inbox password through.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { listRequests, updateRequest, deleteRequest } from '../../lib/requests-api';

export const prerender = false;
export const GET: APIRoute = ({ request }) => listRequests(request, env);
export const PATCH: APIRoute = ({ request }) => updateRequest(request, env);
export const DELETE: APIRoute = ({ request }) => deleteRequest(request, env);
