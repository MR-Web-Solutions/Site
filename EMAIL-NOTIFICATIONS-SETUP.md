# Enable email notifications

1. In Resend, add and verify a domain that you control. Decide on a sender such as `MR Web Solutions <enquiries@your-domain.co.za>`.
2. In Supabase, open **Edge Functions** and then **Secrets**. Add these two secrets:
   - `RESEND_API_KEY` — paste your Resend key here.
   - `RESEND_FROM_EMAIL` — your verified sender, for example `MR Web Solutions <enquiries@your-domain.co.za>`.
3. In **Edge Functions**, choose **Deploy a new function** → **Via Editor**. Name it `submit-enquiry`.
4. Replace the starter code with the contents of `supabase/functions/submit-enquiry/index.ts` from this project. Turn off JWT verification for this public contact-form function, then deploy it.
5. Run `supabase-setup.sql` in the Supabase SQL Editor if you have not already done so.
6. Submit a test enquiry through the Contact page. It should appear in `enquiries.html` and send an email notification to all three staff inboxes.

Never put the Resend key in an HTML, CSS, or JavaScript file that is served to website visitors.
