import { MAIL_UNAVAILABLE_MESSAGE } from '../lib/mailServiceMessages';

export default function MailServiceUnavailableBanner({ visible, message }) {
  if (!visible) return null;
  return (
    <div className="alert alert-warning py-2 px-4 mb-0 rounded-0 border-0 small" role="alert">
      <i className="bi bi-envelope-exclamation me-2" aria-hidden="true" />
      {message || MAIL_UNAVAILABLE_MESSAGE}
    </div>
  );
}
