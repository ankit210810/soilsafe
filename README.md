# SoilSafe — Live Reporting + Problem Tracking

SoilSafe is the CHE 110 CA1 soil-pollution awareness and observation-recording website. This version adds a real Supabase-backed workflow for public users and one protected SoilSafe admin account.

## What is included

### Public / user side
- Real email/password account creation and login through Supabase Auth.
- Anyone can use the site: LPU student or from another place.
- Personal online records stored in Supabase.
- Every submitted report receives an automatic **Problem Number**, for example:
  `SS-2026-000127`
- **Track a Problem** page: a signed-in user enters the Problem Number and sees their own report, status, response and evidence link.
- **My Records** shows each user's Problem Numbers and current status.
- In-app notification center (bell icon) for report submission and admin updates.
- Notifications can be marked read.
- Optional photo evidence stored in Supabase Storage.

### Admin side
- Only the account whose `profiles.role` is `admin` sees the Admin area.
- Admin dashboard shows all reports.
- Search is easy using the Problem Number shown on each report.
- Admin can set:
  - New
  - Under review
  - Response suggested
  - Resolved
- Admin can write a **message to the reporter** and a **suggested solution**.
- Clicking **Save update & notify user** updates the report and creates a notification for the reporter in one secure database transaction.
- The reporter sees the update from another device after signing in.

## IMPORTANT: database upgrade

If your current SoilSafe database already exists, **do not run the old `supabase-schema.sql` again**, because that file is the original first-time schema.

Instead, in Supabase:

1. Open **SQL Editor**.
2. Create a **New query**.
3. Open/copy the entire contents of `supabase-problem-tracking.sql`.
4. Paste it into the SQL editor.
5. Click **Run**.
6. Wait for `Success. No rows returned` (or successful SQL results).
7. Refresh your website with **Ctrl + Shift + R**.

The migration is non-destructive. It adds Problem Numbers, notifications, profile fields used by the profile UI, and the secure admin update function without deleting your existing users or reports.

## Admin account

You said you already have one admin account. Keep that account.

If it is not already an admin, find its user UUID in:

**Supabase → Authentication → Users**

Then run:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_AUTH_USER_UUID';
```

Do not make the admin role selectable in the public signup form.

## Supabase URL and key

Open `supabase-config.js` and put your project's public values there:

```js
window.SOILSAFE_SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
window.SOILSAFE_SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_KEY";
```

Use the **Publishable key** from Supabase → Settings → API Keys. Never put a Supabase secret/service-role key in this website.

## Storage

The original schema creates the `report-evidence` public bucket for report photos. Keep the bucket and its existing policies if they are already working.

## User notification note

The included notification system is a real **in-app notification system** stored in the Supabase `notifications` table. It does not require an external email provider.

If you later want automatic email/SMS/WhatsApp notifications too, those require an additional server-side provider and should not expose private API keys in `script.js`.

## Scientific limitation

SoilSafe does not perform laboratory soil testing and does not identify contaminants from photographs. It records observations and clearly distinguishes visual evidence, further investigation and laboratory confirmation.

## Local testing

For a local copy, run it through a local web server rather than opening `index.html` directly. For example, VS Code Live Server is suitable.

For a public website that works from phones and other devices, deploy the folder to a static host such as GitHub Pages, Netlify, Vercel or another HTTPS host after the Supabase configuration is complete.


## Restored login, profile and admin flow

1. Open `supabase-config.js`. The SoilSafe Project URL is already set to `https://zbuewjdemufnzrklkwkg.supabase.co`. Paste your existing **Supabase Publishable key** into `SOILSAFE_SUPABASE_ANON_KEY`. Never use the Secret/service-role key.
2. In Supabase SQL Editor, run `supabase-problem-tracking.sql` once. It is a non-destructive migration and also restores the evidence field and automatic profile creation.
3. Sign in with the existing admin email/password. The header will show **Admin account** and the **Admin** section becomes visible.
4. If the account is not admin yet, find its UUID in Authentication > Users and run: `update public.profiles set role = 'admin' where id = 'YOUR_USER_UUID';`
5. A normal user sees **My profile**, where they can edit full name, city, bio and LPU/other-place status.
6. Every report receives a Problem Number such as `SS-2026-000127`; admin updates create an in-app notification for the reporter.
