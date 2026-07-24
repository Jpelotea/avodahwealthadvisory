# Milestone 4 remediation register

Assessment date: 2026-07-24  
Branch: `agent/blueprint-foundation`  
Pull request: #8 (draft)

| Item | Source | Severity | Required change | Status | Commit |
|---|---|---:|---|---|---|
| Legacy GA event calls could enter the data layer before analytics consent | Preview source review | High | Gate all `event` calls until current-version analytics consent is granted | Resolved | `40a04292eaa6c8abeaa555b687613e9f5097f097` |
| Global navigation and legacy page scripts could bind the mobile toggle twice | Preview source review | High | Replace the toggle node before global binding and suppress legacy binding when the shell owns the header | Resolved | `3a88a6e6361b5133e49fe1cd2e6adb8e863c7fc9`, `3353ce493f20c97f46399c8ebed548ec55b1e3ba` |
| New workflows were available mainly through `.html` paths | Milestone 3 known limitation | Medium | Add clean public route rewrites, compatibility redirects, canonical normalization, and clean navigation links | Resolved | `a037790bfe7750d3bd87e6ef18c38400caa12769`, `b2442536ef1b7e955666c63b1112d3b32829f730` |
| Netlify detected legacy combined consent schemas for consultation entry points | Netlify form inspection | High | Declare processing and optional marketing consent separately in static form definitions | Resolved | `20e8443f809bd21d0b3fa21de02b33a90ffae831` |
| Needs Check used one combined service-processing checkbox | Form review | High | Add required processing consent, unchecked optional marketing permission, versions, timestamp, and legacy compatibility mirror | Resolved | `c89b2903924eeba10ac5626e9e0de84ecfafa154`, `3c1da74177eb3f80439cee3bf634f5ae6bce2b23` |
| Existing 24-column synchronization contract still reads `consent` | Website-to-Hub compatibility review | High | Preserve a hidden compatibility mirror while keeping permissions separate in the public interface and stored schema | Resolved website-side | `3353ce493f20c97f46399c8ebed548ec55b1e3ba`, `3c1da74177eb3f80439cee3bf634f5ae6bce2b23` |
| Production sitemap did not include the new clean workflow routes | Milestone 3 known limitation | Medium | Add approved public routes and exclude confirmation, error, preview, API, recovery, and duplicate legacy URLs | Resolved | `85ac580ae71b5e3712a78ff103cead25a162f0e1` |
| Full multi-engine and five-width screenshot matrix unavailable in the connected execution environment | QA limitation | Medium | Complete manual Chromium, Firefox, WebKit/Safari, zoom, and representative-width review before production approval | Open | — |
| Hub public booking contract does not show the website `scheduling` object being consumed | Read-only Operations Hub inspection | Approval-dependent | Review proposed contract only after UAT-04 and all maintenance are complete and separate implementation approval is granted | On hold | Proposal documentation only |
| Support ownership, response commitments, retention periods, recruitment classification, and final scheduling profile are not approved | Business/compliance review | Approval-dependent | Obtain written decisions before production release where identified as blocking | Pending | — |

No critical or unresolved high-severity website source defect remains in this register. Production release remains blocked by manual browser/visual QA and the listed business, privacy, and operational approvals.
