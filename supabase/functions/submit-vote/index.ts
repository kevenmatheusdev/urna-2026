import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function fingerprint(token: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token));
  return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: cors });

  try {
    const body = await req.json();
    if (!['22', '13', 'B', 'N'].includes(body.choice)) {
      return Response.json({ error: 'invalid_choice' }, { status: 400, headers: cors });
    }
    if (typeof body.deviceToken !== 'string' || !/^[a-f0-9]{64}$/.test(body.deviceToken)) {
      return Response.json({ error: 'invalid_device_token' }, { status: 400, headers: cors });
    }
    if (body.state != null && (typeof body.state !== 'string' || body.state.length > 80)) {
      return Response.json({ error: 'invalid_state' }, { status: 400, headers: cors });
    }
    if (body.publicTimeline != null && typeof body.publicTimeline !== 'boolean') {
      return Response.json({ error: 'invalid_public_timeline' }, { status: 400, headers: cors });
    }

    const secret = Deno.env.get('DEVICE_TOKEN_HASH_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!secret || new TextEncoder().encode(secret).length < 32 || !supabaseUrl || !serviceRoleKey) {
      throw new Error('server_configuration_missing');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const deviceFingerprint = await fingerprint(body.deviceToken, secret);
    const { data, error } = await supabase.rpc('submit_simulation_vote_with_public_timeline', {
      p_device_fingerprint: deviceFingerprint,
      p_choice: body.choice,
      p_state: body.state ?? null,
      p_public_timeline: body.publicTimeline === true,
    });
    if (error) throw error;
    if (!data?.accepted) {
      return Response.json({ error: 'already_participated', message: 'Este navegador já registrou uma participação.' },
        { status: 409, headers: cors });
    }
    return Response.json({ accepted: true }, { status: 201, headers: cors });
  } catch (error) {
    console.error('submit-vote failed', error);
    return Response.json({ error: 'vote_unavailable', message: 'Não foi possível registrar agora. Tente novamente.' }, { status: 500, headers: cors });
  }
});
