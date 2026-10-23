import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DeviceLimitModal from '../DeviceLimitModal';
import type { UserDeviceSession } from '../../../services/sessionService';

describe('DeviceLimitModal Component', () => {
  const mockSessions: UserDeviceSession[] = [
    {
      id: 'sess-1',
      user_id: 'user-1',
      device_name: 'Apple MacBook Pro',
      browser: 'Chrome',
      os: 'macOS',
      session_token: 'token-1',
      last_active_at: new Date().toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sess-2',
      user_id: 'user-1',
      device_name: 'Apple iPhone 15 Pro',
      browser: 'Safari',
      os: 'iOS',
      session_token: 'token-2',
      last_active_at: new Date().toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sess-3',
      user_id: 'user-1',
      device_name: 'Apple iPad Pro 13-inch',
      browser: 'Safari',
      os: 'iOS',
      session_token: 'token-3',
      last_active_at: new Date().toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  it('does not render when isOpen is false', () => {
    render(
      <DeviceLimitModal
        isOpen={false}
        activeSessions={mockSessions}
        onDisconnectDevice={vi.fn()}
      />
    );

    expect(screen.queryByTestId('device-limit-modal')).toBeNull();
  });

  it('renders all 3 active sessions and disconnect buttons', () => {
    render(
      <DeviceLimitModal
        isOpen={true}
        activeSessions={mockSessions}
        onDisconnectDevice={vi.fn()}
      />
    );

    expect(screen.getByTestId('device-limit-modal')).toBeInTheDocument();
    expect(screen.getByText(/Device Limit Reached \(3 of 3 Active\)/i)).toBeInTheDocument();
    expect(screen.getByText('Apple MacBook Pro')).toBeInTheDocument();
    expect(screen.getByText('Apple iPhone 15 Pro')).toBeInTheDocument();
    expect(screen.getByText('Apple iPad Pro 13-inch')).toBeInTheDocument();

    const disconnectButtons = screen.getAllByRole('button', { name: /Disconnect/i });
    expect(disconnectButtons.length).toBe(3);
  });

  it('calls onDisconnectDevice when a disconnect button is clicked', async () => {
    const handleDisconnect = vi.fn().mockResolvedValue(undefined);

    render(
      <DeviceLimitModal
        isOpen={true}
        activeSessions={mockSessions}
        onDisconnectDevice={handleDisconnect}
      />
    );

    const disconnectBtn = screen.getByRole('button', {
      name: /Disconnect Apple MacBook Pro/i,
    });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(handleDisconnect).toHaveBeenCalledWith('sess-1');
    });

    expect(screen.getByTestId('disconnect-success-banner')).toBeInTheDocument();
  });
});
