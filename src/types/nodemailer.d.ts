declare module 'npm:nodemailer@^6.9.16' {
  export interface SentMessageInfo {
    messageId?: string;
    response?: string;
    accepted?: string[];
    rejected?: string[];
    [key: string]: any;
  }

  export interface Transporter {
    sendMail(mailOptions: any): Promise<SentMessageInfo>;
    verify?(): Promise<boolean>;
    close?(): void;
  }

  export function createTransport(transport?: any, defaults?: any): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };
  export default nodemailer;
}
