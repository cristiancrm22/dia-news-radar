
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface TestEmailRequest {
  email: string;
  smtpConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
    useTLS: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const isTest = url.searchParams.get('test') === 'true';
    
    if (isTest) {
      // Handle test email
      const { email }: TestEmailRequest = await req.json();
      
      console.log("Sending test email to:", email);
      
      const emailResponse = await resend.emails.send({
        from: "News Radar <onboarding@resend.dev>",
        to: [email],
        subject: "Prueba de configuración de correo - News Radar",
        html: `
          <h1>¡Configuración de correo exitosa!</h1>
          <p>Este es un correo de prueba de News Radar.</p>
          <p>Su configuración de correo electrónico está funcionando correctamente.</p>
          <p>Ahora podrá recibir resúmenes de noticias en este correo.</p>
          <br>
          <p>Saludos,<br>Equipo de News Radar</p>
        `,
      });

      console.log("Test email sent successfully:", emailResponse);

      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } else {
      // Handle regular email sending
      const { to, subject, html, from }: EmailRequest = await req.json();
      
      console.log("Sending regular email to:", to);
      
      const emailResponse = await resend.emails.send({
        from: from || "News Radar <onboarding@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });

      console.log("Email sent successfully:", emailResponse);

      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
