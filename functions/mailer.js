// functions/mailer.js
const nodemailer = require("nodemailer");

// Configuração do transporte de e-mail
const transporter = nodemailer.createTransport({
  service: "gmail", // ou outro serviço de e-mail
  auth: {
    user: process.env.GMAIL_EMAIL, // e-mail do remetente
    pass: process.env.GMAIL_PASSWORD, // senha do remetente
  },
});

// Função para enviar e-mail
const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: process.env.GMAIL_EMAIL, // e-mail do remetente
    to, // e-mail do destinatário
    subject, // assunto do e-mail
    text, // corpo do e-mail
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Erro ao enviar e-mail:", error);
    } else {
      console.log("E-mail enviado:", info.response);
    }
  });
};

module.exports = {sendEmail};
