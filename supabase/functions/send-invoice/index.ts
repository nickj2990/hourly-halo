const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getUserIdFromJWT(authHeader: string): string | null {
  try {
    const jwt = authHeader.replace('Bearer ', '');
    const payload = jwt.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const invoice_id = body?.invoice_id;
    if (!invoice_id) throw new Error('invoice_id is required');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const userId = getUserIdFromJWT(authHeader);
    if (!userId) throw new Error('Could not parse user from token');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY is not configured');

    const serviceHeaders = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };

    // Fetch invoice — filtered by user_id so users can only access their own
    const invRes = await fetch(
      `${supabaseUrl}/rest/v1/invoices?select=*,clients(name,billing_email)&id=eq.${invoice_id}&user_id=eq.${userId}`,
      { headers: serviceHeaders }
    );
    const invoices = await invRes.json();
    if (!invoices?.length) throw new Error('Invoice not found');
    const invoice = invoices[0];

    const billingEmail = invoice.clients?.billing_email;
    if (!billingEmail) throw new Error('Client has no billing email set');

    // Fetch business info from user settings
    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/user_settings?select=business_name,business_address&user_id=eq.${userId}`,
      { headers: serviceHeaders }
    );
    const settingsArr = await settingsRes.json();
    const settings = settingsArr?.[0] || {};
    const businessName = settings.business_name || '';
    const businessAddress = settings.business_address || '';

    // Fetch line items
    const itemsRes = await fetch(
      `${supabaseUrl}/rest/v1/invoice_line_items?invoice_id=eq.${invoice_id}&order=date`,
      { headers: serviceHeaders }
    );
    const lineItems = await itemsRes.json() || [];

    // Build HTML email
    const rows = lineItems.map((item: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${item.date}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${item.project_name}${item.task_name ? ` — ${item.task_name}` : ''}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${Number(item.hours).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${Number(item.rate).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${Number(item.amount).toFixed(2)}</td>
      </tr>`).join('');

    const taxRow = Number(invoice.tax_rate) > 0
      ? `<tr><td colspan="4" style="padding:8px;text-align:right;color:#666">Tax (${invoice.tax_rate}%)</td><td style="padding:8px;text-align:right">$${Number(invoice.tax_amount).toFixed(2)}</td></tr>`
      : '';

    const businessBlock = businessName
      ? `<div style="margin-bottom:16px"><strong style="font-size:16px">${businessName}</strong>${businessAddress ? `<br/><span style="color:#666;white-space:pre-line">${businessAddress}</span>` : ''}</div>`
      : '';

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
        ${businessBlock}
        <h2 style="margin-bottom:4px">${invoice.invoice_number}</h2>
        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px;text-align:left">Date</th>
              <th style="padding:8px;text-align:left">Description</th>
              <th style="padding:8px;text-align:right">Hours</th>
              <th style="padding:8px;text-align:right">Rate</th>
              <th style="padding:8px;text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="4" style="padding:8px;text-align:right;color:#666">Subtotal</td><td style="padding:8px;text-align:right">$${Number(invoice.subtotal).toFixed(2)}</td></tr>
            ${taxRow}
            <tr style="font-weight:bold;font-size:1.1em">
              <td colspan="4" style="padding:8px;text-align:right">Total</td>
              <td style="padding:8px;text-align:right">$${Number(invoice.total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p style="color:#888;font-size:12px">This invoice was sent via Billable.</p>
      </div>`;

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: billingEmail,
        subject: `Invoice ${invoice.invoice_number} — $${Number(invoice.total).toFixed(2)}`,
        html,
      }),
    });

    const resendBody = await resendRes.json();
    if (!resendRes.ok) throw new Error(`Resend error: ${JSON.stringify(resendBody)}`);

    // Mark invoice as sent
    await fetch(`${supabaseUrl}/rest/v1/invoices?id=eq.${invoice_id}`, {
      method: 'PATCH',
      headers: serviceHeaders,
      body: JSON.stringify({ status: 'sent' }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-invoice error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
