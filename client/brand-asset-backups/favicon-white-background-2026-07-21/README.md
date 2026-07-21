# Previous NYC Cleaning Favicon Package

This directory preserves the white-background favicon package that was live before the transparent-background update deployed on July 21, 2026.

## Preserved files

- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png`
- `favicon-192x192.png`
- `favicon-512x512.png`

## Reverting

To restore the former favicon, replace the matching files in `client/public/` with these files and update the favicon version query in `client/index.html` to a new value. The new query value ensures browsers do not retain the transparent icon from cache.
