# Redesign Package Asset and Component Inventory

The supplied archive contains **34 original files**: 31 page prototypes, one shared stylesheet (`site.css`), one prototype runtime (`support.js`), and one thumbnail metadata file. The extracted audit workspace also contains four generated audit files. There are **no production image files, SVG logos, font files, framework source components, or CMS exports** in the archive.

| Asset or component | Finding |
| --- | --- |
| Navigation | Repeated inline HTML across the prototypes, not a reusable source component. |
| Prototype logo | A styled `NC` text mark plus the company name; it is not the current NYC Cleaning logo and will not be used as the production logo. |
| Current logo | Not included in the archive. The rebuild will use the verified logo asset referenced by the live website. |
| Imagery | No image binaries are supplied. Visual positions are text placeholders such as `placeholder — porter in uniform, building lobby`. |
| Shared styles | `site.css` defines the prototype’s navy/gold editorial direction, grids, typography, buttons, cards, footer, and responsive rules. |
| Prototype runtime | `support.js` renders the custom prototype tags and simple template directives; it is design-preview support code, not production application logic. |
| Fonts | Google Fonts references request Archivo and Source Sans 3; no local font files are included. |
| Testimonials | Testimonial content is embedded in page HTML. It is source material only and will not be presented as a fabricated or seeded review dataset. |

The implementation will preserve the prototype’s useful hierarchy—editorial headings, dense service taxonomy, asymmetrical content grids, and decisive calls to action—while replacing the text mark, gold-heavy palette, repeated markup, and every placeholder with the verified logo, the live brand’s green/blue color relationship, typed React components, and deployment-safe generated imagery.
