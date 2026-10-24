import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: cors });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await supabase.rpc('get_simulation_results');
    if (error) throw error;
    return Response.json(data, { headers: { ...cors, 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('results failed', error);
    return Response.json({ error: 'results_unavailable' }, { status: 500, headers: cors });
  }
});
