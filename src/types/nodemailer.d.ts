// Minimal tip təsviri (yalnız istifadə etdiyimiz hissə).
declare module "nodemailer" {
  interface Transport {
    sendMail(opts: { from: string; to: string; subject: string; text: string; html?: string }): Promise<unknown>;
  }
  export function createTransport(opts: {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
  }): Transport;
  const _default: { createTransport: typeof createTransport };
  export default _default;
}
