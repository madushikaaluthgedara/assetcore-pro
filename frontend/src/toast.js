// ============================================================
//  AssetCore Pro — in-page toast (replaces window.alert)
//
//  Why: in the packaged Electron app on Windows, the native
//  alert() popup can open BEHIND the app window. The app then
//  looks frozen (it is waiting for OK on a dialog you cannot
//  see) until the dialog is found and dismissed.
//  A toast drawn inside the page can never hide behind the
//  window, never blocks the app, and closes itself.
// ============================================================

let container = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.style.cssText =
    'position:fixed;top:18px;left:50%;transform:translateX(-50%);' +
    'z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;';
  document.body.appendChild(container);
  return container;
}

export function toast(message, ms = 6000) {
  ensureContainer();
  const el = document.createElement('div');
  el.textContent = String(message);
  el.style.cssText =
    'background:#0f172a;color:#e2e8f0;border:1px solid #334155;' +
    'border-radius:10px;padding:12px 18px;max-width:540px;' +
    'box-shadow:0 10px 30px rgba(0,0,0,.55);' +
    'font:14px/1.45 system-ui,sans-serif;cursor:pointer;white-space:pre-wrap;';
  el.title = 'Click to close';
  const close = () => el.remove();
  el.addEventListener('click', close);
  container.appendChild(el);
  setTimeout(close, ms);
}

// Swap the blocking native alert for the toast, app-wide.
export function replaceNativeAlert() {
  window.alert = (msg) => toast(msg);
}

// ------------------------------------------------------------
//  confirmDialog — in-page replacement for window.confirm().
//  The native confirm popup causes the same freeze as alert()
//  (this is what froze the app after Delete). This draws the
//  question inside the page with Delete / Cancel buttons and
//  resolves true (Delete) or false (Cancel / clicked outside).
// ------------------------------------------------------------
export function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100000;' +
      'display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText =
      'background:#0f172a;color:#e2e8f0;border:1px solid #334155;' +
      'border-radius:12px;padding:20px 22px;max-width:420px;' +
      'box-shadow:0 20px 50px rgba(0,0,0,.6);font:14px/1.5 system-ui,sans-serif;';

    const text = document.createElement('div');
    text.textContent = String(message);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:16px;';

    const makeBtn = (label, bg) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText =
        `background:${bg};color:#fff;border:none;border-radius:8px;` +
        'padding:8px 16px;font:600 13px system-ui,sans-serif;cursor:pointer;';
      return b;
    };
    const yesBtn = makeBtn('Delete', '#dc2626');
    const noBtn = makeBtn('Cancel', '#334155');

    const done = (v) => { overlay.remove(); resolve(v); };
    yesBtn.addEventListener('click', () => done(true));
    noBtn.addEventListener('click', () => done(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) done(false); });

    row.appendChild(noBtn);
    row.appendChild(yesBtn);
    box.appendChild(text);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}
