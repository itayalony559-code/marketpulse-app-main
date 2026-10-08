

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type PremiumWebhookRequest = {
  email: string;
  plan: 'Monthly' | 'Yearly';
  amount: number;
  currency: string;
  timestamp: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: "Webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json() as Partial<PremiumWebhookRequest>;
    const { email, plan, amount, currency, timestamp } = body;

    if (
      typeof email !== "string" || !email.includes("@") ||
      (plan !== "Monthly" && plan !== "Yearly") ||
      typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 ||
      typeof currency !== "string" || currency.length !== 3 ||
      typeof timestamp !== "string" || !Number.isFinite(Date.parse(timestamp))
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid premium subscription payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = {
      event: "premium_subscription_activated",
      email,
      plan,
      amount,
      currency,
      timestamp,
      user: {
        email,
      },
      subscription: {
        plan,
        amount,
        currency,
      },
      purchased_at: timestamp,
    };

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Webhook delivery failed (${webhookResponse.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
