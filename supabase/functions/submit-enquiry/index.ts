import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character));

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const publishableKeys = Object.values(JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}'));
  if (!publishableKeys.includes(request.headers.get('apikey') || '')) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const business = String(body.business || '').trim();
    const email = String(body.email || '').trim();
    const packageName = String(body.package || 'General enquiry').trim();
    const message = String(body.message || '').trim();
    if (!name || !email || !message || name.length > 120 || email.length > 254 || message.length > 5000) return json({ error: 'Please complete the required fields.' }, 400);

    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    if (!serviceKey || !supabaseUrl || !resendKey || !fromEmail) return json({ error: 'Server email configuration is incomplete.' }, 500);

    const supabase = createClient(supabaseUrl, serviceKey);
    const { error: insertError } = await supabase.from('enquiries').insert({ name, business, email, package: packageName, message });
    if (insertError) throw insertError;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: ['ntsakisi1504@gmail.com', 'ramashilokgotsofatso@gmail.com', 'admin@mweb.co.za'],
        reply_to: email,
        subject: `New website enquiry — ${packageName}`,
        html: `<h2>New website enquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Business:</strong> ${escapeHtml(business || 'Not supplied')}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Package:</strong> ${escapeHtml(packageName)}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      }),
    });
    if (!emailResponse.ok) throw new Error(`Email notification failed: ${await emailResponse.text()}`);
    return json({ success: true }, 201);
  } catch (error) {
    console.error(error);
    return json({ error: 'We could not send your enquiry right now.' }, 500);
  }
});
