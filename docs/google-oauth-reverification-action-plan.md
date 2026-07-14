# Google OAuth Branding Re-verification Action Plan

**Prepared:** July 14, 2026  
**App name to use everywhere:** **NYC Cleaning**

## What Is Already Correct

| Requirement | Live status |
|---|---|
| Public company domain | `https://www.nyccleaning.co/` is accessible |
| Privacy Policy | `https://www.nyccleaning.co/privacy-policy/` is public and contains the Google Sign-In disclosure |
| Terms of Service | `https://www.nyccleaning.co/terms-of-service/` is public and distinct from the Privacy Policy |
| Search discovery | Both policy pages appear in the WordPress page sitemap |
| Crawler access | The site’s `robots.txt` does not block normal public pages |

## Why the Current Homepage Is Still Being Rejected

The existing homepage contains the CMS paragraph, but it is placed deep inside a general cleaning-services page and has no clear application heading. The page title and main heading describe a cleaning and maintenance company—not an administrator application. The live homepage also has no visible **Privacy Policy** or **Terms of Service** links in its navigation, app-description area, or company footer.

Google therefore has to infer that an isolated paragraph near the bottom is the homepage for a separate OAuth application. That presentation is too ambiguous for the requirement that an app homepage clearly explain the application’s purpose and link to its legal documents.[1]

## Required WordPress Changes

Create a new public WordPress page using the copy in `wordpress-google-oauth-app-homepage.md`.

| WordPress setting | Exact value |
|---|---|
| Page title | `NYC Cleaning — Administrator Content Management Application` |
| URL slug | `nyc-cleaning-admin` |
| Expected URL | `https://www.nyccleaning.co/nyc-cleaning-admin/` |
| Visibility | Public |
| Search setting | Indexable; do not use `noindex` |
| Navigation label | `Administrator Application` |

The first visible heading on the page must begin with **NYC Cleaning**. Immediately below it, show **Administrator Content Management Application**, followed by the purpose, authorized-user, and Google data-use text. Add normal clickable links on the page using these exact destinations:

- **Privacy Policy:** `https://www.nyccleaning.co/privacy-policy/`
- **Terms of Service:** `https://www.nyccleaning.co/terms-of-service/`

Also add visible **Privacy Policy**, **Terms of Service**, and **Administrator Application** links to the global WordPress footer. Do not rely only on links in the Google Cloud form; reviewers expect the application homepage itself to link to the legal pages.

## Google Cloud Branding Fields

After the WordPress page is published, use the following values in **Google Auth Platform → Branding**:

| Google field | Exact value |
|---|---|
| App name | `NYC Cleaning` |
| Application home page | `https://www.nyccleaning.co/nyc-cleaning-admin/` |
| Application privacy policy link | `https://www.nyccleaning.co/privacy-policy/` |
| Application terms of service link | `https://www.nyccleaning.co/terms-of-service/` |
| Authorized domain | `nyccleaning.co` |

Do not enter `www.nyccleaning.co` as a separate authorized domain if Google requests the registrable domain; use `nyccleaning.co`.

## Verification Before Resubmitting

Open a private/incognito browser window where you are not signed in to WordPress. Visit the three URLs directly and confirm that each loads without a password, consent popup, redirect to login, or server error. On the app homepage, confirm that the following content is visible without clicking an accordion or opening a modal:

1. **NYC Cleaning** as the app/brand name;
2. **Administrator Content Management Application** as the purpose heading;
3. A plain-language explanation that authorized administrators manage website articles and images;
4. An explanation that Google Sign-In is used for authentication;
5. A statement that access is restricted to approved administrators; and
6. Clickable Privacy Policy and Terms of Service links.

Clear any WordPress page cache and CDN cache after publishing. Then test the page source or reader view to confirm that the text exists as normal HTML text rather than appearing only inside an image, video, canvas, popup, or script-generated animation.

## What to Select in Google

Once the dedicated page and footer links are live and the Google Branding fields are saved, return to **Branding verification issues**, select **I have fixed the issues**, and request re-verification. Do **not** select “I believe the issues found are incorrect,” because the current public homepage presentation is genuinely ambiguous and lacks the required visible policy links.

## Reference

[1]: https://developers.google.com/identity/protocols/oauth2/policies "Google OAuth 2.0 Policies"

Google states that the application homepage must be publicly accessible, accurate, relevant to the app, describe the app’s functionality, and include links to the privacy policy and terms of service.[1]
