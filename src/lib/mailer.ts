/**
 * E-poçt göndərişi (SMTP, nodemailer). SMTP konfiqurasiya edilməyibsə:
 *  - development: keçid server jurnalına yazılır;
 *  - production: xəta jurnala yazılır və false qaytarılır.
 */
import "server-only";
import { env, isProd } from "./env";
import { escapeHtml } from "./markdown";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(msg: MailMessage): Promise<boolean> {
  const { smtp } = env;
  if (!smtp.host || !smtp.from) {
    if (isProd) {
      console.error("[mail] SMTP konfiqurasiya edilməyib; məktub göndərilmədi:", msg.subject);
      return false;
    }
    console.info(`\n[mail:dev] Kimə: ${msg.to}\n[mail:dev] Mövzu: ${msg.subject}\n${msg.text}\n`);
    return true;
  }
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      // nodemailer-in defolt gözləmələri dəqiqələrlədir (qoşulma 2 dəq, soket 10 dəq): SMTP əlçatmazsa
      // qeydiyyat sorğusu Vercel funksiyasının limitinədək asılı qalırdı. Qısa limit — xəta jurnala düşür, sorğu bitir.
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
    });
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0f1d33">${escapeHtml(msg.text)
      .split("\n")
      .join("<br>")}</div>`;
    await transport.sendMail({ from: smtp.from, to: msg.to, subject: msg.subject, text: msg.text, html });
    return true;
  } catch (err) {
    console.error("[mail] Göndərmə xətası:", err);
    return false;
  }
}
