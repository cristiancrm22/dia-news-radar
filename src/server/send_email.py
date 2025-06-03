
import smtplib
import sys
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import argparse

def send_email(smtp_host, smtp_port, smtp_user, smtp_pass, to_email, subject, html_content, use_tls=True):
    """
    Envía un email usando SMTP
    """
    try:
        # Crear el mensaje
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_content, "html"))

        # Conectar al servidor SMTP
        if use_tls:
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port)
        
        # Autenticar y enviar
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        
        print(json.dumps({
            "success": True,
            "message": "Email enviado exitosamente",
            "method": "python-smtp"
        }))
        return True
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "method": "python-smtp"
        }))
        return False

def main():
    parser = argparse.ArgumentParser(description='Enviar email via SMTP')
    parser.add_argument('--smtp-host', required=True, help='Servidor SMTP')
    parser.add_argument('--smtp-port', type=int, required=True, help='Puerto SMTP')
    parser.add_argument('--smtp-user', required=True, help='Usuario SMTP')
    parser.add_argument('--smtp-pass', required=True, help='Contraseña SMTP')
    parser.add_argument('--to', required=True, help='Destinatario')
    parser.add_argument('--subject', required=True, help='Asunto del email')
    parser.add_argument('--html', required=True, help='Contenido HTML')
    parser.add_argument('--use-tls', action='store_true', default=True, help='Usar TLS')
    
    args = parser.parse_args()
    
    success = send_email(
        smtp_host=args.smtp_host,
        smtp_port=args.smtp_port,
        smtp_user=args.smtp_user,
        smtp_pass=args.smtp_pass,
        to_email=args.to,
        subject=args.subject,
        html_content=args.html,
        use_tls=args.use_tls
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
