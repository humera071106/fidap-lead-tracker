# FIDAP Solutions — Lead Tracker (installable mobile app)

This project is a **Progressive Web App (PWA)**. It looks and opens like an installed Android app but **does not require Google Play Store or an APK**. Everyone logs into the same shared database and can view/edit all employees' leads.

## Included

- Private email/password employee login, accounts created by an administrator
- Shared dashboard with counts for Positive / Potential / No Response / Negative
- Add multiple leads in one submission
- Lead Number (4 digits including leading zero), optional Lead Name, status, comments and follow-up date
- View all team leads, grouped by most recent updating employee, with filters and search
- Edit any lead; history recorded automatically, including which logged-in employee made each change
- Follow-up queue (overdue/today/upcoming)
- Live refresh when the database signals a lead change
- Android home-screen installation with icon and standalone display
- Responsive layouts for phones and laptops

## 1. Create the shared database (Supabase)

1. Go to https://supabase.com/dashboard, create a project, and wait for database initialization.
2. Select **SQL Editor > New query**, paste the entire `supabase-schema.sql`, then **Run**. This creates `profiles`, `leads`, and `lead_updates`, enables Row Level Security, configures lead history and realtime.
3. Go to **Authentication > Providers > Email** (or Sign In / Providers in the latest dashboard) and **disable public sign-ups**; employees should not create their own public accounts.
4. Go to **Authentication > Users > Add user**. Create one account for each authorized employee with their email and a strong initial password. Confirm/auto-confirm the email where the dashboard provides that option.
5. Find **Project Settings > API** (or the project's Connect panel). Copy the **Project URL** and the **publishable / anon key** (use `sb_publishable_...` or the legacy `anon` key). NEVER copy a `service_role` or secret key into a frontend environment variable.
6. After an employee signs in, they can update their real display name under **My Profile**. Future lead updates use the name on their authenticated profile.

All signed-in employees can view and update everyone's leads. Anonymous visitors cannot access them. Creation and edits are stamped with the actual logged-in user ID. SQL prohibits normal client-side deletion. Admins should periodically export backups.

## 2. Publish the app — recommended for this business: Cloudflare Pages

Vercel's free Hobby plan is legally restricted to **personal, non-commercial** use; FIDAP is a business. Use **Cloudflare Pages** for low-cost hosting if its current plan/terms fit your operation, or use Vercel's Pro plan.

### Cloudflare Pages via GitHub

1. Unzip the project and upload its contents to a **private GitHub repository** (not the surrounding parent folder).
2. Visit https://dash.cloudflare.com and go to **Workers & Pages > Create application > Pages > Import an existing Git repository**.
3. Connect the repository. Set **Build command:** `npm run build` and **Build output directory:** `dist`.
4. In **Settings / Environment variables** (or in build-time settings), set:
   - `VITE_SUPABASE_URL` = the Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = the Supabase publishable/anon key
5. Deploy. Cloudflare returns a link such as `https://your-project.pages.dev`.
6. Share the link with your approved team members along with their logins.

### Alternative: Vercel (Pro plan for commercial use)

1. Push files to a private GitHub repo; visit https://vercel.com and import it.
2. Framework: **Vite**, build command `npm run build`, output directory `dist` (usually auto-detected).
3. Add the same two `VITE_` environment variables, deploy, and share the generated URL.

NOTE: Publishable key visibility in frontend code is expected. **RLS policies** protect the database, not the secrecy of the publishable key. Never disable RLS or expose the service role key.

## 3. Install on Android (without Play Store)

1. Open the deployed FIDAP URL in **Google Chrome** on the phone.
2. Tap the **three-dot menu** (⋮).
3. Choose **Install app** or **Add to Home screen**, then confirm.
4. Launch **FIDAP Leads** from its icon in the launcher/home screen.
5. Log in with the employee's email and password.

Chrome on Android phones with Google Mobile Services normally installs it as a standalone WebAPK. Other browsers may use a home-screen shortcut. This is **not** a distributable standalone APK file.

## 4. Test the team workflow

1. Sign in as employee A and add two leads in one batch.
2. Sign in as employee B on a different device and verify both appear under **All Leads**.
3. Employee B opens a lead and taps **Edit**, changes Potential to Positive and saves.
4. Both devices should display the new status; open **History** to verify the update was preserved with employee B's name.
5. Add a Follow-up Date, then open **Follow-ups** to check the queue.

## 5. Running locally (optional)

Install Node.js 20+ (Node.js 22 recommended), then:

```bash
npm install
cp .env.example .env
# Edit .env with your project's URL and PUBLISHABLE/anon key
npm run dev
```

For a production build:

```bash
npm run build
```

The `dist/` folder is the static site. Internet access and a working Supabase project are required for login, lead reads and writes. The service worker caches the app shell, **not customer data**. No guaranteed offline data entry is implemented.

## Important notes

- **Existing Google Sheets are NOT migrated automatically.** This is a new Supabase database. Old Apps Script submissions remain in Google Sheets unless separately imported. Do not abandon your old tracker until data has been migrated and checked.
- Two different clients can have the **same four digits**. This app gives each client a separate UUID. To update an existing client, use **All Leads > Edit**. When adding a number that already appears, the form shows a warning but permits creating a separate client when necessary.
- All authenticated employees have the same **view and edit** permissions, as requested. There is no manager-only editing role yet; SQL logs update history for accountability.
- Live updates depend on Supabase Realtime and an active connection. The app also refreshes when opened or when Refresh is tapped.
- In this starter release, dashboards fetch records in pages of 1,000. For very large datasets, add server-side filtering/pagination and server-calculated statistics before scaling up.
- Use strong passwords, restrict who gets employee accounts, and periodically remove accounts when someone leaves.
- Supabase free plan may pause after inactivity and has capacity limits; check current pricing before production use.
- The PWA icon is a simple F placeholder; it can be replaced with FIDAP's official logo later.

## Quick launch checklist

- [ ] Supabase project created under the company administrator's account.
- [ ] `supabase-schema.sql` executed without errors in the SQL Editor.
- [ ] Public account sign-ups disabled in Supabase Authentication settings.
- [ ] Team login users created and profile names updated.
- [ ] Project source uploaded to a **private** GitHub repository.
- [ ] Cloudflare Pages Git-based deployment linked to the private repository.
- [ ] Build command = `npm run build`; output directory = `dist`.
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured in Cloudflare Pages **before deployment** (or trigger a new deployment).
- [ ] Test one new lead and one edited lead from separate employee accounts.
- [ ] Check `lead_updates` receives a history entry for both operations.
- [ ] Import/verify any older Google Sheets records before switching the team over.
- [ ] Test install from Chrome on an Android device.

### If the app shows “Database connection needed”

The hosting build did not receive the two `VITE_` variables. Set them in Cloudflare Pages > project > Settings > Environment variables, then redeploy the latest build. Use only the public/publishable/anon key; **never** a secret/service role key.

### If a team member cannot sign in

Check the email and password in Supabase Authentication > Users, and ensure public sign-up is disabled. Ensure the SQL script has created the corresponding row under `profiles`.

### If leads do not appear

Make sure the SQL was executed successfully, the user is signed in, and the phone has internet access. Check Cloudflare build logs and browser console for errors. Supabase Row Level Security policies must remain enabled.

### Launch/privacy warning

Every signed-in employee can read and edit all records by design. Do not give access to outsiders. The four-digit number is not a reliable unique identifier; confirm lead identity before editing. Keep periodic database backups and establish a process for removing departed employees.
