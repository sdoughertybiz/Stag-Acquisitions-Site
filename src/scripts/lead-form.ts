/**
 * Enhances both lead forms — the seller intake on /offer and the buy-box
 * intake on /investors. Posts JSON to /api/lead and swaps in an inline success
 * panel. Without JS the same form posts natively and the endpoint redirects
 * back to the originating page with ?status=… — see handler.ts.
 */

const form = document.querySelector<HTMLFormElement>('#offer-form, #buybox-form');
const success = document.querySelector<HTMLElement>('#form-success');
const statusBanner = document.querySelector<HTMLElement>('#form-status');

const FALLBACK_PHONE = '(216) 488-8920';

function showStatus(message: string): void {
  if (!statusBanner) return;
  statusBanner.textContent = message;
  statusBanner.hidden = false;
  statusBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearErrors(scope: HTMLFormElement): void {
  scope.querySelectorAll<HTMLElement>('.field-error').forEach((el) => (el.textContent = ''));
  scope.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((el) =>
    el.setAttribute('aria-invalid', 'false'),
  );
  if (statusBanner) statusBanner.hidden = true;
}

function applyErrors(scope: HTMLFormElement, errors: Record<string, string>): void {
  let firstField: HTMLElement | null = null;
  for (const [field, message] of Object.entries(errors)) {
    const input = scope.querySelector<HTMLElement>(`[name="${field}"]`);
    const slot = scope.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
    if (slot) slot.textContent = message;
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      if (!firstField) firstField = input;
    }
  }
  firstField?.focus();
}

/**
 * Serialize the form to a flat object.
 *
 * Object.fromEntries would silently keep only the last value of a repeated
 * field, which would reduce the buy-box asset-type checkboxes to a single
 * selection. Repeated keys are joined instead so the CRM receives all of them.
 */
function serialize(scope: HTMLFormElement): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const [key, value] of new FormData(scope).entries()) {
    if (typeof value !== 'string') continue;
    payload[key] = key in payload ? `${payload[key]}, ${value}` : value;
  }
  return payload;
}

/** Show the status banner from a no-JS round trip, then clean up the URL. */
function handleRedirectStatus(): void {
  const params = new URLSearchParams(window.location.search);
  const state = params.get('status');
  if (!state) return;

  if (state === 'ok' && form && success) {
    form.hidden = true;
    success.hidden = false;
  } else if (state === 'error') {
    showStatus(`We couldn't submit that just now. Please call or text ${FALLBACK_PHONE}.`);
  } else if (state === 'invalid') {
    showStatus('Please check the form and try again.');
  }

  window.history.replaceState({}, '', window.location.pathname + window.location.hash);
}

handleRedirectStatus();

if (form && success) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const buttonLabel = button?.querySelector<HTMLElement>('.cta-label');
    const originalLabel = buttonLabel?.textContent ?? 'Send it';
    if (button) button.disabled = true;
    if (buttonLabel) buttonLabel.textContent = 'Sending…';

    const payload = serialize(form);
    payload.pageUrl = window.location.href;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        ok: boolean;
        message?: string;
        errors?: Record<string, string>;
      };

      if (response.ok && body.ok) {
        form.hidden = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (body.errors) applyErrors(form, body.errors);
      showStatus(body.message ?? 'Something went wrong. Please try again.');
    } catch {
      showStatus(`We couldn't reach our system. Please call or text ${FALLBACK_PHONE}.`);
    } finally {
      if (button) button.disabled = false;
      if (buttonLabel) buttonLabel.textContent = originalLabel;
    }
  });
}
