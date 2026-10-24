import { vi } from 'vitest';

export interface SentMessageInfo {
  messageId: string;
  response: string;
  accepted: string[];
  rejected: string[];
  [key: string]: any;
}

export const mockSendMail = vi.fn(async (mailOptions: any) => {
  return {
    messageId: `<mock-${Date.now()}-${Math.random().toString(36).substring(7)}@realtorbuddy.ae>`,
    response: '250 2.0.0 OK: message queued',
    accepted: Array.isArray(mailOptions?.to)
      ? mailOptions.to
      : typeof mailOptions?.to === 'string'
      ? mailOptions.to.split(',').map((s: string) => s.trim())
      : ['recipient@realtorbuddy.ae'],
    rejected: [],
  };
});

export function createTransport(_config?: any) {
  return {
    sendMail: mockSendMail,
    verify: async () => true,
    close: () => {},
  };
}

const nodemailerMock = {
  createTransport,
};

export default nodemailerMock;
