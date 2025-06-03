import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ✅ CONFIGURACIÓN
smtp_host = "smtp.gmail.com"
smtp_port = 587
smtp_user = "n8ncrm@gmail.com"  # Tu dirección Gmail
smtp_pass = "vtks imof fqqs cvny"  # NO uses tu clave normal

# ✅ DATOS DEL CORREO
to_email = "n8ncrm@gmail.com"
subject = "Prueba de configuración de correo - News Radar"
html_content = """
<h1>¡Configuración de correo exitosa!</h1>
<p>Este es un correo de prueba de News Radar.</p>
<p>Su configuración de correo electrónico está funcionando correctamente.</p>
<p>Configuración utilizada:</p>
<ul>
  <li>Servidor SMTP: smtp.gmail.com</li>
  <li>Puerto: 587</li>
  <li>TLS: Activado</li>
</ul>
<p>Ahora podrá recibir resúmenes de noticias en este correo.</p>
<br>
<p>Saludos,<br>Equipo de News Radar</p>
"""

# ✅ ARMADO Y ENVÍO
msg = MIMEMultipart()
msg["From"] = smtp_user
msg["To"] = to_email
msg["Subject"] = subject
msg.attach(MIMEText(html_content, "html"))

try:
    server = smtplib.SMTP(smtp_host, smtp_port)
    server.starttls()
    server.login(smtp_user, smtp_pass)
    server.send_message(msg)
    server.quit()
    print("✅ Correo enviado exitosamente.")
except Exception as e:
    print("❌ Error al enviar el correo:", e)
