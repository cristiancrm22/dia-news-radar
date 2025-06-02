
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
  smtpConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
    useTLS: boolean;
  };
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
      const { email, smtpConfig }: TestEmailRequest = await req.json();
      
      console.log("Sending test email to:", email);
      console.log("SMTP Config:", smtpConfig ? "Custom SMTP" : "Resend");
      
      if (smtpConfig) {
        // Use custom SMTP configuration
        try {
          const client = new SMTPClient({
            connection: {
              hostname: smtpConfig.host,
              port: smtpConfig.port,
              tls: smtpConfig.useTLS,
              auth: {
                username: smtpConfig.username,
                password: smtpConfig.password,
              },
            },
          });

          await client.send({
            from: smtpConfig.username,
            to: email,
            subject: "Prueba de configuración SMTP - News Radar",
            content: `
              <h1>¡Configuración SMTP exitosa!</h1>
              <p>Este es un correo de prueba de News Radar usando su configuración SMTP personalizada.</p>
              <p>Configuración utilizada:</p>
              <ul>
                <li>Servidor: ${smtpConfig.host}:${smtpConfig.port}</li>
                <li>Usuario: ${smtpConfig.username}</li>
                <li>TLS: ${smtpConfig.useTLS ? 'Activado' : 'Desactivado'}</li>
              </ul>
              <p>Su configuración de correo electrónico está funcionando correctamente.</p>
              <br>
              <p>Saludos,<br>Equipo de News Radar</p>
            `,
            html: `
              <h1>¡Configuración SMTP exitosa!</h1>
              <p>Este es un correo de prueba de News Radar usando su configuración SMTP personalizada.</p>
              <p>Configuración utilizada:</p>
              <ul>
                <li>Servidor: ${smtpConfig.host}:${smtpConfig.port}</li>
                <li>Usuario: ${smtpConfig.username}</li>
                <li>TLS: ${smtpConfig.useTLS ? 'Activado' : 'Desactivado'}</li>
              </ul>
              <p>Su configuración de correo electrónico está funcionando correctamente.</p>
              <br>
              <p>Saludos,<br>Equipo de News Radar</p>
            `,
          });

          await client.close();

          console.log("SMTP test email sent successfully");

          return new Response(JSON.stringify({ success: true, method: "smtp" }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
        } catch (smtpError) {
          console.error("SMTP Error:", smtpError);
          return new Response(
            JSON.stringify({ error: `SMTP Error: ${smtpError.message}` }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      } else {
        // Use Resend as fallback
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

        console.log("Resend test email sent successfully:", emailResponse);

        return new Response(JSON.stringify({ success: true, data: emailResponse, method: "resend" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
    } else {
      // Handle regular email sending
      const { to, subject, html, from, smtpConfig }: EmailRequest = await req.json();
      
      console.log("Sending regular email to:", to);
      console.log("Using:", smtpConfig ? "Custom SMTP" : "Resend");
      
      if (smtpConfig) {
        // Use custom SMTP configuration
        try {
          const client = new SMTPClient({
            connection: {
              hostname: smtpConfig.host,
              port: smtpConfig.port,
              tls: smtpConfig.useTLS,
              auth: {
                username: smtpConfig.username,
                password: smtpConfig.password,
              },
            },
          });

          await client.send({
            from: from || smtpConfig.username,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject,
            content: html,
            html,
          });

          await client.close();

          console.log("SMTP email sent successfully");

          return new Response(JSON.stringify({ success: true, method: "smtp" }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
        } catch (smtpError) {
          console.error("SMTP Error:", smtpError);
          return new Response(
            JSON.stringify({ error: `SMTP Error: ${smtpError.message}` }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      } else {
        // Use Resend
        const emailResponse = await resend.emails.send({
          from: from || "News Radar <onboarding@resend.dev>",
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        });

        console.log("Resend email sent successfully:", emailResponse);

        return new Response(JSON.stringify({ success: true, data: emailResponse, method: "resend" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
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
