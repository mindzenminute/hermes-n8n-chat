import { NextRequest } from 'next/server';

const HERMES_URL = process.env.HERMES_URL || 'https://hermes.siriko.fr/v1/chat/completions';
const HERMES_API_KEY = process.env.HERMES_API_KEY || '';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const response = await fetch(HERMES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HERMES_API_KEY}`,
    },
    body: JSON.stringify({
      ...body,
      model: 'n8n-workflows',
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return new Response(error, { status: response.status });
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
