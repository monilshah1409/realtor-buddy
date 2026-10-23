import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FeedbackModal, { SUPPORT_EMAIL } from '../FeedbackModal';
import FeedbackButton from '../FeedbackButton';

describe('FeedbackModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(<FeedbackModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('feedback-modal-content')).toBeNull();
  });

  it('renders modal with topic, brief, and contact inputs when open', () => {
    render(
      <FeedbackModal
        isOpen={true}
        onClose={vi.fn()}
        userEmail="agent@realtorbuddy.ae"
        userName="Karim Al-Sayed"
      />
    );

    expect(screen.getByTestId('feedback-modal-content')).toBeInTheDocument();
    expect(screen.getAllByText(SUPPORT_EMAIL).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Topic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Brief Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('Karim Al-Sayed');
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue('agent@realtorbuddy.ae');
  });

  it('validates required fields before submitting', async () => {
    render(
      <FeedbackModal
        isOpen={true}
        onClose={vi.fn()}
        userEmail=""
        userName=""
      />
    );

    const form = screen.getByTestId('feedback-modal-content').querySelector('form')!;
    fireEvent.submit(form);

    expect(screen.getByTestId('feedback-error-banner')).toHaveTextContent(/brief description/i);
  });

  it('submits feedback to handler and renders confirmation state', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FeedbackModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmitFeedback={handleSubmit}
        userEmail="agent@realtorbuddy.ae"
        userName="Karim Al-Sayed"
      />
    );

    fireEvent.change(screen.getByLabelText(/Brief Description/i), {
      target: { value: 'There is a pricing inaccuracy on Burj Crown listing.' },
    });
    fireEvent.change(screen.getByLabelText(/Topic/i), {
      target: { value: 'listing_complaint' },
    });

    const submitBtn = screen.getByRole('button', { name: /Send Message/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'listing_complaint',
          brief: 'There is a pricing inaccuracy on Burj Crown listing.',
          name: 'Karim Al-Sayed',
          email: 'agent@realtorbuddy.ae',
        })
      );
    });

    expect(screen.getByTestId('feedback-success-state')).toBeInTheDocument();
    expect(screen.getByText(/Thank you! Your feedback has been sent/i)).toBeInTheDocument();
  });
});

describe('FeedbackButton Component', () => {
  it('renders persistent floating button and handles click', () => {
    const handleClick = vi.fn();
    render(<FeedbackButton onClick={handleClick} />);

    const button = screen.getByTestId('global-feedback-button');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
