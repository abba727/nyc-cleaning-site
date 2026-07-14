# NYC Cleaning — Google OAuth Branding Verification Checklist

## What Google Flagged

The screenshot shows two branding-verification issues:

1. The homepage does not explain the purpose of the application.
2. The consent-screen app name, **“nyc-cleaning,”** does not match the name presented on the homepage.

Google’s current OAuth policy requires a publicly accessible homepage on a verified domain. The homepage must describe the app’s functionality and link to its privacy policy and terms of service. Google also requires the consent-screen identity and policy links to accurately represent the application and organization.[1][2]

## Recommended Consent-Screen Values

| Google Cloud field | Recommended value |
| --- | --- |
| App name | **NYC Cleaning** |
| Application home page | **https://www.nyccleaning.co/** |
| Privacy policy | Publish the supplied Privacy Policy on its own public URL under **nyccleaning.co** |
| Terms of service | Publish the supplied Terms on a different public URL under **nyccleaning.co** |
| Authorized domain | **nyccleaning.co** |
| User support email | A monitored NYC Cleaning email address |
| Developer contact | A monitored email address associated with the Google Cloud project |

Do not use the same WordPress URL for both the Privacy Policy and Terms of Service. The screenshot currently shows the privacy-policy URL in both fields.

## Copy to Add to the Public Homepage

Add a short section that is visible without signing in. The app purpose should be explicit and should use the same name as the Google consent screen.

### Suggested Heading

**NYC Cleaning Website Administration**

### Suggested Paragraph

> The NYC Cleaning website includes a private content-management application for authorized NYC Cleaning administrators. Approved administrators use Google Sign-In to access the application, manage website articles and images, and maintain published website content. The application uses only basic Google Account information—name, email address, profile image, and a unique account identifier—to authenticate users and confirm administrative access. It does not request access to Gmail, Google Drive, Google Contacts, or Google Calendar.

### Suggested Links Immediately Below It

> [Privacy Policy] · [Terms of Service]

Link those labels to the two separate WordPress pages you publish.

## WordPress Publishing Steps

Publish each document as its own public WordPress **Page**, not a post. Use clear titles such as **Privacy Policy** and **Terms of Service**, and use separate slugs such as:

* `https://www.nyccleaning.co/privacy-policy/`
* `https://www.nyccleaning.co/terms-of-service/`

Add both links to the public homepage and site footer. Confirm each URL opens in a private/incognito browser without requiring login, returning an error, or redirecting to another domain. The privacy-policy domain should match the homepage domain and be verified through Google Search Console.[2][3]

In Google Cloud, change the app name from **nyc-cleaning** to **NYC Cleaning** so it matches the public brand shown on the homepage. Then update the privacy and terms fields with the two distinct URLs and resubmit by selecting **I have fixed the issues**.

## Requested Google Scopes

For the planned administrator login, request only:

* `openid`
* `email`
* `profile`

Google requires applications to request the smallest scope set necessary for their functionality.[1] The administrator CMS does not need Gmail, Drive, Contacts, Calendar, or other Google API scopes.

## References

[1]: https://developers.google.com/identity/protocols/oauth2/policies "Google OAuth 2.0 Policies"
[2]: https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification "Google OAuth Brand Verification"
[3]: https://support.google.com/cloud/answer/13806988?hl=en "Google Cloud Help — App Privacy Policy"
