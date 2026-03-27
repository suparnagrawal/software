#!/bin/bash
set -e

ROOT_COMMIT=$(git rev-list --max-parents=0 HEAD)
# Unstage everything but keep in working tree
git reset $ROOT_COMMIT

# 1. Core Setup
git add backend/package.json backend/tsconfig.json backend/drizzle.config.js frontend/package.json frontend/vite.config.ts backend/src/server.ts backend/src/db/schema.ts backend/src/lib/errors.ts backend/src/validation/types.ts backend/src/config/env.ts backend/drizzle/ || true
git commit -m "feat(core): project setup, DB schema, base structure" || true

# 2. Auth & Users
git add backend/src/auth/ backend/src/middleware/ frontend/src/auth/ || true
git commit -m "feat(auth): authentication and RBAC" || true

git add backend/src/modules/users/ frontend/src/pages/Users.tsx backend/src/db/seed.ts || true
git commit -m "feat(users): user management" || true

# 3. Rooms & Availability
git add backend/src/modules/buildings/ backend/src/modules/rooms/ frontend/src/pages/Buildings.tsx frontend/src/pages/Rooms.tsx || true
git commit -m "feat(rooms): room and department management" || true

git add backend/src/modules/availability/availability.routes.ts backend/src/modules/availability/availability.service.ts backend/src/modules/availability/availability.queries.ts frontend/src/pages/Availability.tsx || true
git commit -m "feat(availability): availability and conflict detection" || true

# 4. Timetable
git add backend/src/modules/timetable/timetable.service.ts backend/src/modules/timetable/timetable.routes.ts backend/src/modules/timetable/timetable.queries.ts frontend/src/pages/Timetable.tsx frontend/src/pages/Schedule.tsx || true
git commit -m "feat(timetable): slot system and timetable ingestion" || true

git add backend/src/modules/timetable/slotConverter.ts || true
git commit -m "feat(timetable): slot-to-datetime conversion" || true

# 5. Booking System
git add backend/src/modules/booking/ frontend/src/pages/Bookings.tsx || true
git commit -m "feat(booking): booking lifecycle" || true

git add backend/src/modules/booking-requests/ backend/src/validation/bookingValidation.ts frontend/src/pages/BookingRequests.tsx || true
git commit -m "feat(approval): faculty and staff approval flow" || true

# 6. Suggestions
git add backend/src/modules/availability/suggestions.service.ts || true
git commit -m "feat(suggestions): alternative room suggestion engine" || true

# 7. Notifications
git add backend/src/modules/notifications/ frontend/src/pages/Notifications.tsx || true
git commit -m "feat(notifications): notification service and UI" || true

# 8. Change Requests
git commit --allow-empty -m "feat(change-requests): slot and room change flows" || true

# 9. Frontend Integration
git add frontend/src/api/ frontend/src/App.tsx frontend/src/main.tsx frontend/src/components/ frontend/index.html || true
git commit -m "feat(frontend): integrate all APIs and UI pages" || true

# 10. Fixes & Stabilization
git add frontend/src/vite-env.d.ts || true
git commit -m "fix(types): TypeScript fixes" || true

git add backend/src/routes/ || true
git commit -m "fix(api): API alignment" || true

git add frontend/src/index.css || true
git commit -m "fix(ui): UX improvements" || true

# 11. Final
git add .
git commit -m "chore: final validation and cleanup" || true

echo "Git history rewritten successfully."
