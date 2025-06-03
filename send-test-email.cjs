const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS (no SSL)
  auth: {
    user: "n8ncrm@gmail.com", // Tu cuenta de Gmail
    pass: "vtks imof fqqs cvny", // No uses la contraseña normal
  },
});

const mailOptions = {
  from: '"News Radar" <n8ncrm@gmail.com>',
  to: "n8ncrm@gmail.com",
  subject: "Prueba de configuración de correo - News Radar",
  html: `
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
  `,
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log("❌ Error al enviar:", error);
  }
  console.log("✅ Correo enviado:", info.response);
});
