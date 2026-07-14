# Google OAuth Re-verification Diagnosis — July 14, 2026

## Live Homepage Findings

The public URL inspected was `https://www.nyccleaning.co/`.

The homepage does contain the administrator-application paragraph, but the disclosure is buried well below the primary cleaning-company content and is not introduced by a clear application heading. More importantly, the live homepage does not expose a visible **Privacy Policy** link or **Terms of Service** link in the page navigation, disclosure block, or footer. A direct search for “Privacy Policy” on the rendered homepage returned no result.

The page title is **“Cleaning and Maintenance Company: Professional Services,”** and the hero identifies a cleaning and maintenance company. This makes the connection between the OAuth application and the homepage unclear to a reviewer, particularly because the CMS description appears as an isolated paragraph without a product/app heading, sign-in context, or adjacent policy links.

## Likely Cause of the Rejection

The paragraph alone does not make the homepage function as an application homepage. Google’s published requirements state that the homepage must be publicly accessible, clearly relevant to the app, describe the app’s functionality, and link to the privacy policy and terms. The current page fails the clarity and linked-policy presentation tests even though the paragraph text itself is accurate.

## Safest Remediation

Create a dedicated, publicly accessible WordPress page for the OAuth application, such as:

`https://www.nyccleaning.co/nyc-cleaning-admin/`

Use **NYC Cleaning Admin** as the exact app name in all three places:

1. Google OAuth consent-screen app name;
2. Dedicated WordPress page title and main heading; and
3. Application description on that page.

Set the dedicated page—not the general cleaning-services homepage—as the **Application home page** in Google Cloud. The page should contain the company logo, a clear app-purpose heading, the exact functionality, intended users, Google data used, and direct visible links to separate Privacy Policy and Terms of Service URLs.

As a fallback, the same content can be placed near the top of the main homepage, but a dedicated application page is less ambiguous and more likely to satisfy a manual reviewer.

## Sources

1. Google OAuth 2.0 Policies: https://developers.google.com/identity/protocols/oauth2/policies
2. Google OAuth Brand Verification: https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
3. Google Cloud App Privacy Policy Help: https://support.google.com/cloud/answer/13806988?hl=en
