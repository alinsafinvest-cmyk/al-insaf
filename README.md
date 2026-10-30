## Production setup

Use Node.js 20.9 or newer. Copy `.env.example` to `.env.local` for local
development, then set real values locally or in your hosting provider's secret
manager. Never commit `.env.local` or put server secrets in `NEXT_PUBLIC_*`
variables.

The app requires:

- `MONGODB_URI`: production MongoDB connection string with access limited to
  this application.
- `JWT_SECRET`: unique random secret of at least 32 characters.

`GOOGLE_APPS_SCRIPT_URL` is used for member-file uploads through Google Apps
Script. `GOOGLE_SHEETS_SYNC_SECRET` protects the sheet import/export APIs.
Rotate any previously used sync token before publishing; the protected API
returns `503` when its secret is not configured.

### Automatic MongoDB-to-Google-Sheets sync

The bound Apps Script in `scripts/google-sheets-auto-sync.gs` pulls every
non-system MongoDB collection into a same-named sheet tab every five minutes.
It exports data in pages, stages each tab before replacing it, and records the
last run in the `__sync_status` tab. Passwords, tokens, credentials, API keys,
and private keys are omitted from exported records.

1. Deploy the app at a publicly reachable HTTPS URL. Google Apps Script cannot
   reach a local `localhost` development server.
2. Create or open the Google Sheet, then choose **Extensions → Apps Script**.
   Copy the contents of `scripts/google-sheets-auto-sync.gs` into the editor
   and save the project.
3. In Apps Script **Project Settings → Script properties**, add:
   - `APP_URL`: the deployed app origin, such as `https://example.com` (no
     trailing slash).
   - `SYNC_TOKEN`: the exact value configured as `GOOGLE_SHEETS_SYNC_SECRET`
     in the app's hosting secrets.
4. Run `installMongoSheetSyncTrigger` once from the Apps Script editor and
   approve its requested Google Sheets and external-request permissions. This
   creates one five-minute trigger and runs the first sync immediately.
5. Check the `__sync_status` tab for `SUCCESS`. Keep the sync token private;
   rotate it in both places together if it is exposed.

This is a one-way export (MongoDB to Google Sheets); changes made in the sheet
are not written back to MongoDB. The existing `/api/sheets/sync` endpoint is a
separate, authenticated import path for legacy sheet data.

Create the initial administrator once after configuring `.env.local` with
`INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and a unique
`INITIAL_ADMIN_PASSWORD` of at least 16 characters:

```bash
node scripts/seed-admin.js
```

The script never prints the password. Remove the initial-admin variables after
creating the account, and use the normal account-management flow thereafter.

Before publishing, run:

```bash
npm ci
npm run lint
npm run build
```

Set the production environment variables in the hosting provider, verify the
deployed site over HTTPS, and test login, database-backed pages, and admin
workflows using non-production test accounts before opening access to members.

## SSLCOMMERZ online deposits

## SSLCOMMERZ online deposits

Member deposits can use SSLCOMMERZ hosted checkout. Configure these **server-only**
variables in `.env.local` or the hosting provider's secret manager (never expose
them with a `NEXT_PUBLIC_` prefix):

```env
APP_URL=https://your-public-site.example
SSLCOMMERZ_MODE=sandbox
SSLCOMMERZ_STORE_ID=your-store-id
SSLCOMMERZ_STORE_PASSWORD=your-store-password
```

Use sandbox credentials with `SSLCOMMERZ_MODE=sandbox` for testing. For
production, set the mode to `live`, use production credentials, and set `APP_URL`
to the public HTTPS origin. Register `/api/payments/sslcommerz/callback` as the
IPN URL in the merchant settings. Deposits are credited only after the server
validates the provider transaction, BDT currency, transaction ID, and amount.
Do not enable live mode until a successful end-to-end sandbox deposit has been
verified.

Credentials are issued by SSLCOMMERZ and are not included in the repository.
SSLCOMMERZ checkout accepts incoming payments; it does not automatically send
member withdrawals. Outbound bKash/Nagad/bank payouts require separate merchant
payout access and provider-specific integration.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
