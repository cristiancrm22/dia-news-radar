
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing email request...");
    
    const { to, subject, html, from, smtpConfig }: EmailRequest = await req.json();
    
    console.log("Email request data:", { 
      to, 
      subject, 
      hasSmtpConfig: !!smtpConfig,
      from: from || "default" 
    });
    
    // Siempre usar Resend ya que el SMTP personalizado no es compatible con Edge Functions
    console.log("Using Resend for email sending");
    
    const emailResponse = await resend.emails.send({
      from: from || "News Radar <onboarding@resend.dev>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    console.log("Email sent successfully with Resend:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      data: emailResponse, 
      method: "resend",
      message: smtpConfig ? "Usando Resend (SMTP personalizado no disponible en Edge Functions)" : "Email enviado con Resend"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
      
  } catch (error: any) {
    console.error("Error in send-email function:", error);
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
