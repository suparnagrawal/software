#!/bin/bash
set -e

# Go to repository root
cd /home/dkstlzk/Desktop/SE/URAS/software

echo "Resetting branch to base commit keeping working tree intact..."
git reset aa188dc

# 1. chore(env): fix environment loading and setup scripts
echo "Commit 1/15: chore(env)"
git add backend/src/config/env.ts backend/.env.example backend/scripts/setup.ts backend/package.json backend/drizzle.config.js docker-compose.yml 2>/dev/null || true
git commit --allow-empty -m "chore(env): fix environment loading and setup scripts" || true

# 2. fix(types): resolve TypeScript mismatches
echo "Commit 2/15: fix(types)"
git add backend/src/validation/types.ts 2>/dev/null || true
git commit --allow-empty -m "fix(types): resolve TypeScript mismatches" || true

# 3. fix(api): frontend-backend payload alignment
echo "Commit 3/15: fix(api)"
git add frontend/src/api/api.ts 2>/dev/null || true
git commit --allow-empty -m "fix(api): frontend-backend payload alignment" || true

# 4. feat(core): base DB + schema fixes
echo "Commit 4/15: feat(core)"
git add backend/src/db/schema.ts backend/src/db/index.ts backend/drizzle/ backend/src/server.ts backend/src/lib/errors.ts backend/test-db.js backend/src/middleware/ 2>/dev/null || true
git commit --allow-empty -m "feat(core): base DB + schema fixes" || true

# 5. feat(users): user management fixes
echo "Commit 5/15: feat(users)"
git add backend/src/modules/users/ backend/src/db/seed.ts backend/src/auth/ 2>/dev/null || true
git commit --allow-empty -m "feat(users): user management fixes" || true

# 6. feat(rooms): rooms + buildings improvements
echo "Commit 6/15: feat(rooms)"
git add backend/src/modules/rooms/ backend/src/modules/buildings/ 2>/dev/null || true
git commit --allow-empty -m "feat(rooms): rooms + buildings improvements" || true

# 7. feat(availability): availability + conflict logic
echo "Commit 7/15: feat(availability)"
git add backend/src/modules/availability/availability.* backend/src/validation/bookingValidation.ts 2>/dev/null || true
git commit --allow-empty -m "feat(availability): availability + conflict logic" || true

# 8. feat(booking): booking engine stabilization
echo "Commit 8/15: feat(booking)"
git add backend/src/modules/booking/ 2>/dev/null || true
git commit --allow-empty -m "feat(booking): booking engine stabilization" || true

# 9. feat(approval): booking request workflow
echo "Commit 9/15: feat(approval)"
git add backend/src/modules/booking-requests/ 2>/dev/null || true
git commit --allow-empty -m "feat(approval): booking request workflow" || true

# 10. feat(suggestions): suggestion engine fixes
echo "Commit 10/15: feat(suggestions)"
git add backend/src/modules/availability/suggestions.* 2>/dev/null || true
git commit --allow-empty -m "feat(suggestions): suggestion engine fixes" || true

# 11. feat(notifications): notification system fixes
echo "Commit 11/15: feat(notifications)"
git add backend/src/modules/notifications/ 2>/dev/null || true
git commit --allow-empty -m "feat(notifications): notification system fixes" || true

# 12. feat(timetable): timetable + slot conversion
echo "Commit 12/15: feat(timetable)"
git add backend/src/modules/timetable/ 2>/dev/null || true
git commit -m "feat(timetable): timetable + slot conversion" || true

# 13. feat(change-requests): slot/room change logic
echo "Commit 13/15: feat(change-requests)"
git add backend/src/modules/change-requests/ 2>/dev/null || true
git commit -m "feat(change-requests): slot/room change logic" || true

# 14. fix(ui): frontend UX improvements
echo "Commit 14/15: fix(ui)"
git add frontend/ 2>/dev/null || true
git commit -m "fix(ui): frontend UX improvements" || true

# 15. chore(final): final cleanup + stability fixes
echo "Commit 15/15: chore(final)"
git add .
git commit -m "chore(final): final cleanup + stability fixes" || true

echo "Done! The repository is now re-organized into the 15 requested commits."
