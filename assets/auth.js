(function () {
  'use strict';
  var SUPABASE_URL = 'https://pvgqwuarkdbwaegsfxdd.supabase.co';
  var PUBLISHABLE_KEY = 'sb_publishable_HfHcmwV31gjflm966tqVxA_KrALJwtW';
  var client = window.supabase.createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  var query = new URLSearchParams(window.location.search);
  var fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  var tokenHash = query.get('token_hash');
  var type = (query.get('type') || '').toLowerCase();
  var linkError = query.get('error_description') || fragment.get('error_description');
  // Keep the one-time token out of the address bar, history and screenshots.
  if (tokenHash || linkError) window.history.replaceState(null, '', window.location.pathname);

  function show(name) {
    document.querySelectorAll('[data-state]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-state') === name);
    });
    var active = document.querySelector('[data-state="' + name + '"] h1');
    if (active) { active.setAttribute('tabindex', '-1'); active.focus({ preventScroll: true }); }
  }
  function setText(id, value) { var el = document.getElementById(id); if (el) el.textContent = value; }

  function friendly(error) {
    var code = (error && (error.code || error.error_code)) || '';
    var message = (error && error.message) || '';
    if (code === 'otp_expired' || /expired|invalid/i.test(message)) return 'This link has expired or was already used. Links work once and only for a limited time.';
    if (code === 'same_password' || /different from the old/i.test(message)) return 'Choose a password you haven\u2019t used for CampusLoop before.';
    if (code === 'weak_password' || /weak|at least/i.test(message)) return 'That password is too easy to guess. Use 8 or more characters with a mix of letters, numbers and symbols.';
    if (code === 'over_request_rate_limit' || /rate limit|too many/i.test(message)) return 'Too many attempts. Wait a minute, then try again.';
    if (/fetch|network/i.test(message)) return 'We couldn\u2019t reach CampusLoop. Check your connection and try again.';
    return message || 'Something went wrong. Try again.';
  }

  function score(p) {
    if (!p) return 0;
    if (p.length < 8) return 1;
    var kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(p); }).length;
    if (p.length >= 12 && kinds >= 3) return 4;
    if (kinds >= 3 || (p.length >= 12 && kinds >= 2)) return 3;
    return 2;
  }
  var labels = ['Use at least 8 characters.', 'Too short', 'Okay \u00b7 add numbers or symbols', 'Strong password', 'Very strong password'];

  function wirePasswordForm(onSubmit) {
    var form = document.getElementById('password-form');
    var pass = document.getElementById('new-password');
    var again = document.getElementById('confirm-password');
    var meter = document.getElementById('meter');
    var hint = document.getElementById('meter-hint');
    var alertBox = document.getElementById('form-alert');
    var submit = document.getElementById('submit');
    document.querySelectorAll('.toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.getAttribute('aria-controls'));
        var visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        btn.setAttribute('aria-pressed', String(!visible));
        btn.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
      });
    });
    pass.addEventListener('input', function () {
      var s = score(pass.value);
      meter.setAttribute('data-score', String(s));
      hint.textContent = labels[s];
      pass.removeAttribute('aria-invalid');
    });
    again.addEventListener('input', function () { again.removeAttribute('aria-invalid'); });
    function fail(message, field) {
      alertBox.textContent = message;
      alertBox.className = 'alert bad show';
      if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      alertBox.className = 'alert';
      if (pass.value.length < 8) return fail('Use at least 8 characters.', pass);
      if (pass.value !== again.value) return fail('The two passwords don\u2019t match.', again);
      submit.disabled = true;
      var original = submit.textContent;
      submit.textContent = 'Saving\u2026';
      onSubmit(pass.value).catch(function (error) {
        fail(friendly(error));
      }).finally(function () {
        submit.disabled = false;
        submit.textContent = original;
      });
    });
  }

  var page = document.body.getAttribute('data-page');

  if (linkError) {
    setText('error-text', /expired|invalid/i.test(linkError) ? friendly({ code: 'otp_expired' }) : linkError);
    show('error');
    return;
  }
  if (!tokenHash) {
    setText('error-text', 'This link is incomplete. Open the newest email from CampusLoop and tap the button again.');
    show('error');
    return;
  }

  if (page === 'confirm') {
    var verifyType = type === 'signup' ? 'email' : type;
    if (['email', 'invite', 'magiclink', 'email_change'].indexOf(verifyType) === -1) {
      setText('error-text', 'This link isn\u2019t a CampusLoop confirmation link.');
      show('error');
      return;
    }
    show('loading');
    client.auth.verifyOtp({ token_hash: tokenHash, type: verifyType }).then(function (result) {
      if (result.error) throw result.error;
      if (verifyType === 'invite') {
        show('form');
        wirePasswordForm(function (password) {
          return client.auth.updateUser({ password: password }).then(function (r) {
            if (r.error) throw r.error;
            return client.auth.signOut({ scope: 'local' });
          }).then(function () { show('done'); });
        });
        return;
      }
      if (verifyType === 'email_change') {
        if (!result.data || !result.data.session) {
          setText('success-title', 'One more step');
          setText('success-text', 'We confirmed this address. Open the link we sent to your other email address to finish changing it.');
        } else {
          setText('success-title', 'Email address updated');
          setText('success-text', 'Your CampusLoop account now uses this email address. Use it the next time you sign in.');
        }
      }
      if (verifyType === 'magiclink') {
        setText('success-title', 'You\u2019re verified');
        setText('success-text', 'Open the CampusLoop app to keep going.');
      }
      show('success');
      return client.auth.signOut({ scope: 'local' });
    }).catch(function (error) {
      setText('error-text', friendly(error));
      show('error');
    });
  }

  if (page === 'reset') {
    if (type && type !== 'recovery') {
      setText('error-text', 'This link isn\u2019t a CampusLoop password reset link.');
      show('error');
      return;
    }
    var verified = false;
    show('form');
    wirePasswordForm(function (password) {
      var step = verified ? Promise.resolve() : client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(function (r) {
        if (r.error) throw r.error;
        verified = true;
      });
      return step.then(function () {
        return client.auth.updateUser({ password: password });
      }).then(function (r) {
        if (r.error) throw r.error;
        // End every other session that used the old password.
        return client.auth.signOut({ scope: 'global' });
      }).then(function () { show('done'); }, function (error) {
        var code = (error && error.code) || '';
        var message = (error && error.message) || '';
        if (code === 'otp_expired' || (!verified && /expired|invalid/i.test(message))) {
          setText('error-text', friendly(error));
          show('error');
          return;
        }
        throw error;
      });
    });
  }
})();
