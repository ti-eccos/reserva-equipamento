// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure o transporter do Nodemailer com suas credenciais SMTP
// Você pode usar Gmail, mas recomendo serviços como SendGrid ou Mailgun
const transporter = nodemailer.createTransport({
  service: "gmail", // Ou outro serviço como 'SendGrid'
  auth: {
    user: "suporte@colegioeccos.com.br",
    pass: "rqmi ysvx mfbx hrmd",
  },
});

// Função que será acionada quando uma nova reserva for adicionada
exports.sendEmailOnNewReservation = functions.firestore
    .document("reservations/{reservationId}")
    .onCreate(async (snap, context) => {
    // Dados da nova reserva
      const newReservation = snap.data();
      const reservationId = context.params.reservationId;

      try {
      // Buscar os administradores no banco de dados
        const adminsSnapshot = await admin.firestore()
            .collection("users")
            .where("role", "==", "admin")
            .get();

        if (adminsSnapshot.empty) {
          console.log("Nenhum administrador encontrado para notificar");
          return null;
        }

        // Lista de emails dos administradores
        const adminEmails = [];
        adminsSnapshot.forEach((doc) => {
          const adminData = doc.data();
          if (adminData.email) {
            adminEmails.push(adminData.email);
          }
        });

        if (adminEmails.length === 0) {
          console.log("Nenhum email de administrador encontrado");
          return null;
        }

        // Formatação da data
        const formattedDate = newReservation.date instanceof admin.firestore.Timestamp ?
        newReservation.date.toDate().toLocaleDateString("pt-BR") :
        "Data não disponível";

        // Preparar email
        const mailOptions = {
          from: "Sistema de Reservas <seu-email@gmail.com>",
          to: adminEmails.join(", "),
          subject: "Nova Reserva Pendente - Sistema de Reservas",
          html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #3498db;">Nova Reserva Pendente</h2>
            <p>Uma nova reserva foi criada e está aguardando aprovação.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>ID da Reserva:</strong> ${reservationId}</p>
              <p><strong>Usuário:</strong> ${newReservation.userName || "Não especificado"}</p>
              <p><strong>Data:</strong> ${formattedDate}</p>
              <p><strong>Horário:</strong> ${newReservation.startTime || "N/A"} - ${newReservation.endTime || "N/A"}</p>
              <p><strong>Equipamentos:</strong> ${newReservation.equipmentNames?.join(", ") || "Não especificado"}</p>
              <p><strong>Finalidade:</strong> ${newReservation.purpose || "Não especificado"}</p>
              <p><strong>Status:</strong> ${newReservation.status || "pendente"}</p>
            </div>
            
            <p>Por favor, acesse o <a href="https://seu-site.com/admin" style="color: #3498db;">Painel Administrativo</a> para revisar esta reserva.</p>
            
            <p style="font-size: 12px; color: #777; margin-top: 30px;">
              Este é um email automático. Por favor, não responda diretamente a este email.
            </p>
          </div>
        `,
        };

        // Enviar email
        return transporter.sendMail(mailOptions);
      } catch (error) {
        console.error("Erro ao enviar email de notificação:", error);
        return null;
      }
    });
