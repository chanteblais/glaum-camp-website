# User Journey

```mermaid
flowchart TD

    %% ── Entry ──────────────────────────────────────────────
    HOME["🏕️ Homepage (/)
    Public schedule, about"]

    HOME --> SIGNIN["Sign in / create account
    (/sign-in)"]
    HOME --> VOL_PATH["Want to volunteer
    as an outsider?"]

    %% ── Volunteer path ──────────────────────────────────────
    subgraph VOLUNTEER ["Outside Volunteer Path"]``
        VOL_PATH --> VOL_FORM["Fill out volunteer form
        (/volunteer)"]
        VOL_FORM --> VOL_PEND(["Status: pending"])
        VOL_PEND --> VOL_ADMIN{"Admin reviews"}
        VOL_ADMIN -- Approve --> VOL_ACTIVE(["Status: active ✓"])
        VOL_ADMIN -- Remove --> VOL_REMOVED(["Status: removed"])
    end

    %% ── Application ─────────────────────────────────────────
    SIGNIN --> HAS_APP{"Existing
    application?"}
    HAS_APP -- No --> APPLY_FORM["Fill out application
    (/apply)"]
    APPLY_FORM --> APP_PEND(["Status: pending"])
    APP_PEND --> ADMIN_REVIEW{"Admin reviews"}
    ADMIN_REVIEW -- Reject --> APP_REJ(["Status: rejected
    Message shown on /apply"])
    APP_REJ --> CANCEL_REJ["Can re-apply?
    (currently no path)"]
    ADMIN_REVIEW -- Approve --> APP_APPROVED

    HAS_APP -- "Pending / Rejected" --> APP_STATUS(["Status message shown
    on /apply"])

    %% ── Approved member experience ───────────────────────────
    APP_APPROVED(["Status: approved ✓"])
    APP_APPROVED --> PROFILE["Member profile hub
    (/profile)"]

    subgraph MEMBER ["Approved Member Experience"]
        PROFILE --> ATUNE["Attunement checklist"]

        ATUNE --> UPLOAD["① Upload photo"]
        ATUNE --> CONTRIB["② Select contributions
        Setup / Teardown / Decor / Other"]
        ATUNE --> PICK_ROLE["③ Pick a role"]
        ATUNE --> PICK_SHIFT["④ Pick a shift"]

        PICK_ROLE --> NOTHING_FITS{"Nothing fits?"}
        NOTHING_FITS -- Yes --> SUGGEST["Suggest a dept / role
        (SuggestRoleModal)"]
        SUGGEST --> SUGG_REVIEW{"Admin reviews
        suggestion"}
        SUGG_REVIEW -- Approve --> NEW_ROLE["Dept + role created
        Member notified 🔔"]
        SUGG_REVIEW -- Reject --> SUGG_REJ["Member notified 🔔"]

        PROFILE --> PERSONAL_SCHED["Personal schedule
        (events matching contributions)"]
        PROFILE --> SETTINGS["Edit profile settings
        (gear icon)"]
        PROFILE --> DIR["Member directory
        (/members)"]
        DIR --> MEMBER_PAGE["View a member's profile
        (/members/id)"]

        PROFILE --> CANCEL_APP["Cancel application"]
        CANCEL_APP --> CANCELLED(["Status: cancelled"])
    end

    %% ── Admin side ───────────────────────────────────────────
    subgraph ADMIN ["Admin (/admin)"]
        ADMIN_DASH["Admin dashboard"]
        ADMIN_DASH --> REVIEW_APPS["Review applications
        Approve / Reject"]
        ADMIN_DASH --> REVIEW_ROLES["Review role requests"]
        ADMIN_DASH --> REVIEW_SUGG["Review role suggestions"]
        ADMIN_DASH --> MANAGE_DEPTS["Manage departments + roles"]
        ADMIN_DASH --> MANAGE_SCHED["Manage schedule + shifts"]
        ADMIN_DASH --> NOTIF_BELL["Notifications 🔔
        New apps, suggestions"]
    end

    %% ── Cross-links ──────────────────────────────────────────
    ADMIN_REVIEW -.->|triggers| ADMIN_DASH
    SUGGEST -.->|creates admin notification| NOTIF_BELL
    APPLY_FORM -.->|creates admin notification| NOTIF_BELL
```

---

## States at a glance

| Who | Status | Where they land |
|---|---|---|
| Unauthenticated visitor | — | Homepage, public schedule |
| Signed in, no application | — | /apply → application form |
| Applied, waiting | `pending` | /apply → status message |
| Rejected | `rejected` | /apply → rejection message |
| Approved member | `approved` | /profile → full member hub |
| Cancelled member | `cancelled` | (TBD — currently no re-entry path) |
| Outside volunteer | `pending/active` | /volunteer confirmation |
| Admin | — | /admin dashboard |

---

## Open questions

- **Rejected applicants** — can they re-apply? There's currently no path for this.
- **Cancelled members** — what happens after cancellation? No re-entry route exists yet.
- **Volunteer ↔ member overlap** — can someone be both a volunteer and an applicant?
- **Role suggestion loop** — after a suggestion is approved and the role is created, does the member automatically land on it, or do they have to go find it in the picker?
- **Shift assignment** — currently self-serve; is there a future admin-assigned shift flow?
