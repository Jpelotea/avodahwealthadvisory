# Avodah Website Blueprint-to-Code Gap Analysis

**Branch:** `agent/blueprint-foundation`  
**Production branch:** `main`  
**Production site:** `https://avodahwealthadvisory.netlify.app/`  
**Assessment date:** 2026-07-24  
**Primary source of truth:** Official Website Strategic and Technical Blueprint for Avodah Wealth Advisory

## Executive assessment

The current website is a static, root-published Netlify site with reusable CSS and JavaScript, Netlify Forms, Google Analytics attribution, security headers, redirects, and serverless functions for consultation availability, booking, booking management, and Operations Hub synchronization.

The safest initial implementation strategy is progressive enhancement rather than an immediate framework migration. The existing production site already supports important live workflows and should remain stable while missing launch pages, shared structures, privacy controls, workflow robustness, and content-management foundations are added on a development branch and tested through preview deployments.

## Architecture decision

### Retain

- Netlify hosting, deployments, forms, redirects, headers, and serverless functions.
- Existing consultation and needs-check journeys while they are verified and progressively improved.
- Existing Google Sheets / Operations Hub integration.
- Existing Google Calendar and Google Meet booking integration.
- Existing UTM and Facebook attribution capture.
- Existing static assets, approved brand colors, typography, and public contact information.
- Existing SEO metadata, sitemap, robots configuration, and JSON-LD where accurate.

### Refactor

- Global navigation and footer into a consistent launch-scope information architecture.
- Large global CSS files into documented design tokens and smaller component-oriented sections.
- Form validation into reusable client-side modules backed by server-side validation.
- Analytics event names and payloads to ensure no personally identifying data is transmitted.
- Confirmation pages into workflow-specific pages with reference numbers and next steps.
- Consultation intake into a structured multi-step workflow with separate required processing consent and optional marketing consent.
- Error handling and operational retry logic for downstream integration failures.

### Replace only when justified

- Static HTML duplication may later be replaced by Astro components after the launch workflows and content model are stable.
- A managed CMS should be introduced after content ownership, approval roles, and cost are approved.
- Public file uploads must not use ordinary public site storage; sensitive uploads require a private, access-controlled storage decision.

## Major requirement classification

| Requirement | Current status | Decision | Phase |
|---|---|---|---|
| Netlify hosting and production deployment | Exists and works | Retain | Launch |
| Static-first frontend | Exists | Retain initially; progressively componentize | Launch |
| Astro with TypeScript | Missing | Defer migration until justified | Later foundation |
| Security headers | Exists | Retain and review periodically | Launch |
| Consultation lead forms | Exists | Refactor into structured intake | Launch |
| Real-time booking | Exists | Retain, test, and align rules | Launch |
| Google Calendar / Meet | Exists | Retain and verify failure handling | Launch |
| Operations Hub lead synchronization | Exists | Retain and test retries / duplicates | Launch |
| Booking management | Exists | Retain and security-review token lifecycle | Launch |
| Recruitment workflow | Missing | Build | Launch |
| Client-support workflow | Missing | Build | Launch |
| General inquiry routing | Partial | Refactor | Launch |
| Workflow-specific confirmation pages | Partial | Build | Launch |
| Cookie notice / preference handling | Missing | Build after tracking decision | Launch |
| 404 page | Missing | Build | Launch |
| Temporary system-error page | Missing | Build | Launch |
| Financial education hub | Partial via checklists and service content | Expand | Launch |
| Articles / blog | Missing or incomplete | Build content structure | Launch |
| FAQ page | Partial on homepage | Build dedicated page | Launch |
| Leadership and team pages | Missing or incomplete | Build with approved content only | Launch |
| CMS | Missing | Evaluate Sanity or approved alternative | Launch foundation / Phase 2 |
| Private resume and sensitive-file storage | Missing | Critical decision required before uploads | Launch blocker for uploads |
| Consent versioning and timestamps | Partial / unverified | Build | Launch |
| Rate limiting and bot protection | Partial | Strengthen server-side | Launch |
| Analytics consent and Meta Pixel | Incomplete | Build after approval | Launch |
| Accessibility testing | Partial implementation | Test and remediate | Launch |
| Automated quality checks | Missing | Add | Launch |

## Confirmed working features to protect

- The production site is deployed from `main` and is currently available.
- Netlify Forms are enabled.
- Four deployed Netlify Functions currently support booking, availability, booking management, and lead synchronization.
- The production deployment contains redirect and security-header rules.
- The site includes a skip link, semantic navigation, mobile-menu behavior, field-level validation, FAQ interaction, GA4 tracking, and UTM attribution.
- Consultation submissions are connected to the existing lead pipeline and can activate optional booking.

## Critical assumptions requiring approval

1. Consultation duration and buffer rules. The blueprint proposes 45 minutes with 15-minute buffers, while the current implementation describes 30-minute appointments with 30-minute buffers.
2. Approved service names, scope statements, provider relationships, and disclaimers.
3. Business, content, recruitment, privacy/compliance, and technical owners.
4. Recruitment role classifications and any compensation-related wording.
5. Whether Sanity or a lower-cost Git-based CMS should be used.
6. Transactional email provider for visitor confirmations.
7. Private storage provider and retention policy for resumes or sensitive supporting documents.
8. Cookie categories, consent behavior, Meta Pixel use, and whether non-essential analytics should wait for consent.
9. Approved response expectations for support, recruitment, and general inquiries.
10. Final canonical production domain.

## Current blockers

- Sensitive resume or document upload cannot be safely launched until private storage, access rules, retention, deletion, and authorized reviewers are approved.
- Final public service and compliance claims cannot be treated as approved without content review.
- A production merge must not occur until a preview deployment and stakeholder review are completed.

These blockers do not prevent development of page structures, non-sensitive forms, design foundations, validation, routing, error states, and placeholders.

## Proposed folder evolution

```text
/
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/                 # only licensed web assets
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── components.css
│   ├── forms.css
│   └── pages.css
├── js/
│   ├── navigation.js
│   ├── attribution.js
│   ├── forms.js
│   ├── analytics.js
│   └── booking.js
├── netlify/functions/
│   ├── booking-slots.mjs
│   ├── book-consultation.mjs
│   ├── manage-booking.mjs
│   └── sync-client-needs.mjs
├── docs/
│   ├── blueprint-gap-analysis.md
│   ├── environment-variables.md
│   ├── testing.md
│   └── deployment.md
├── pages and confirmation pages
├── netlify.toml
├── sitemap.xml
└── robots.txt
```

This structure can be introduced progressively without breaking existing root-level URLs. A later Astro migration can reuse the same design tokens, content model, URL plan, and functions.

## First development milestone

1. Protect production with a dedicated development branch.
2. Document retain/refactor/replace decisions and assumptions.
3. Add missing 404, temporary system-error, and cookie-information pages.
4. Establish shared launch navigation and legal pathways without removing current routes.
5. Prepare the next workflow milestone: client support and recruitment structures using non-sensitive fields first.
6. Validate through a Netlify preview before any production merge.

## Definition of done for this milestone

- Files exist only on the development branch.
- Existing production routes and functions are unchanged.
- New pages work on mobile and desktop using existing assets and CSS.
- Pages include semantic structure, one H1, keyboard-accessible links, SEO metadata, and clear fallbacks.
- Placeholder or approval-dependent language is clearly labeled.
- Changes are documented for stakeholder review.
