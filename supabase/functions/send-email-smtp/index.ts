
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SMTPEmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  useTLS: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing SMTP email request...");
    
    const { 
      to, 
      subject, 
      html, 
      text,
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      useTLS
    }: SMTPEmailRequest = await req.json();
    
    console.log("SMTP Email request data:", { 
      to, 
      subject, 
      smtpHost,
      smtpPort,
      useTLS,
      username: smtpUsername
    });
    
    // Validar datos requeridos
    if (!to || !subject || !html || !smtpHost || !smtpUsername || !smtpPassword) {
      console.error("Faltan datos requeridos para envío SMTP");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Faltan datos requeridos (to, subject, html, smtpHost, smtpUsername, smtpPassword)"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
    
    try {
      console.log("Iniciando conexión SMTP real...");
      
      // Crear cliente SMTP
      const client = new SmtpClient();
      
      // Configurar conexión SMTP con configuraciones específicas para Gmail
      const connectOptions = {
        hostname: smtpHost,
        port: smtpPort,
        username: smtpUsername,
        password: smtpPassword,
      };
      
      // Conectar usando TLS o conexión normal
      if (useTLS && smtpPort === 587) {
        // Para Gmail en puerto 587, usar STARTTLS
        await client.connect(connectOptions);
      } else if (useTLS && smtpPort === 465) {
        // Para Gmail en puerto 465, usar TLS directo
        await client.connectTLS(connectOptions);
      } else {
        await client.connect(connectOptions);
      }
      
      console.log("Conectado a servidor SMTP, enviando email...");
      
      // Enviar email con configuración mejorada
      await client.send({
        from: `"News Radar" <${smtpUsername}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        content: text || "Esta es la versión de texto del email. Por favor revise la versión HTML.",
        html,
      });
      
      await client.close();
      
      console.log("Email enviado correctamente via SMTP");
      
      return new Response(JSON.stringify({ 
        success: true, 
        messageId: `smtp_${Date.now()}`,
        method: "smtp",
        message: "Email enviado correctamente via SMTP"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
      
    } catch (smtpError: any) {
      console.error("Error SMTP:", smtpError);
      
      // Fallback a Resend si SMTP falla
      console.log("SMTP falló, intentando con Resend como fallback...");
      
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const { Resend } = await import("npm:resend@2.0.0");
        const resend = new Resend(resendApiKey);
        
        const emailResponse = await resend.emails.send({
          from: `"News Radar" <${smtpUsername}>`,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        });

        console.log("Email enviado correctamente con Resend (fallback):", emailResponse);

        return new Response(JSON.stringify({ 
          success: true, 
          data: emailResponse, 
          method: "resend-fallback",
          message: "Email enviado correctamente via Resend (fallback)"
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      
      throw smtpError;
    }
      
  } catch (error: any) {
    console.error("Error en función send-email-smtp:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString(),
        success: false
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
