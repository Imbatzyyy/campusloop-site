# CampusLoop site

Public home page, privacy policy, terms and the account email pages for the CampusLoop apps.

- Live site: https://campusloop.store (Cloudflare Pages project `campusloop`, protected by Cloudflare)
- Mirror: https://imbatzyyy.github.io/campusloop-site/ (GitHub Pages; the Google sign-in consent screen links here)

## Account email pages

Supabase Auth emails link to these pages (templates in `../supabase/email-templates`):

- `/auth/confirm/?token_hash=…&type=email|invite|magiclink|email_change` confirms the address with `verifyOtp`.
- `/auth/reset/?token_hash=…&type=recovery` lets the student choose a new password, then signs out every session.

Both pages use the publishable key only, remove the token from the address bar, and send no referrer.
`_headers` sets the security headers and a strict Content-Security-Policy for `/auth/*`.

## Deploy

Cloudflare dashboard → Workers & Pages → `campusloop` → Create deployment → upload a zip of this folder
(without `.git` and `README.md`). The custom domains campusloop.store and www.campusloop.store are attached to the project.
