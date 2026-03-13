import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error('invoice_id is required');

    // Auth: verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify JWT and get user
    const { data: { user }, error: userError } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Fetch invoice with client info
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, clients(name, billing_email)')
      .eq('id', invoice_id)
      .eq('user_id', user.id)
      .single();
    if (invError || !invoice) throw new Error('Invoice not found');

    const billingEmail = invoice.clients?.billing_email;
    if (!billingEmail) throw new Error('Client has no billing email set');

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice_id)
      .order('date');

    // Build HTML email
    const rows = (lineItems || []).map((item: any) => `
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

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
        <h2 style="margin-bottom:4px">${invoice.invoice_number}</h2>
        <p style="color:#666;margin-top:0">from ${user.email}</p>

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
        <p style="color:#888;font-size:12px">This invoice was sent via Hourly Halo.</p>
      </div>`;

    // Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY is not configured');

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // replace with your verified domain sender when ready
        to: billingEmail,
        subject: `Invoice ${invoice.invoice_number} — $${Number(invoice.total).toFixed(2)}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    // Mark invoice as sent
    await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
