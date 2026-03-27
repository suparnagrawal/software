import { execSync } from "child_process";

async function run() {
    const BASE_URL = "http://localhost:5000/api";

    console.log("--> Seeding database to ensure clean state...");
    execSync("npm run seed", { cwd: "./backend", stdio: "ignore" });

    async function login(email) {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: "password123" })
        });
        const data = await res.json();
        return data.token;
    }

    try {
        const adminToken = await login("admin@ura.com");
        const staffToken = await login("staff@ura.com");
        const facultyToken = await login("faculty@ura.com");
        const studentToken = await login("student@ura.com");

        const req = (path, method = "GET", body = null, token = studentToken) =>
            fetch(`${BASE_URL}${path}`, {
                method,
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                ...(body && { body: JSON.stringify(body) })
            }).then(r => r.json());

        console.log("1. Checking users CRUD");
        const users = await req("/users", "GET", null, adminToken);
        if (!users.data || users.data.length < 4) throw new Error("Users fetch failed");

        console.log("2. Checking timetable & slots mapping");
        const sys = await req("/timetable/systems", "POST", { name: "Test System" }, adminToken);
        if (sys.error) throw new Error(sys.error);
        const systemId = sys.data.id;
        await req("/timetable/slots", "POST", { slotSystemId: systemId, name: "T1", dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00" }, adminToken);

        console.log("3. Ensure room exists");
        const rooms = await req("/rooms", "GET", null, studentToken);
        const roomId = rooms.data[0].id;

        console.log("4. Student booking request flow");
        const startAt = new Date();
        startAt.setDate(startAt.getDate() + 1);
        startAt.setHours(9, 0, 0, 0);
        const endAt = new Date(startAt);
        endAt.setHours(10, 0, 0, 0);

        const bReq = await req("/booking-requests", "POST", {
            roomId, startAt: startAt.toISOString(), endAt: endAt.toISOString(), purpose: "Study"
        }, studentToken);
        if (bReq.error) throw new Error(bReq.error);
        const reqId = bReq.data.id;

        console.log("5. Faculty approval");
        const fApprove = await req(`/booking-requests/${reqId}/forward`, "POST", null, facultyToken);
        if (fApprove.error) throw new Error(fApprove.error);

        console.log("6. Staff approval -> Booking created");
        const sApprove = await req(`/booking-requests/${reqId}/approve`, "POST", null, staffToken);
        if (sApprove.error) throw new Error(sApprove.error);

        console.log("7. Checking bookings & conflict suggestions");
        const bReq2 = await req("/booking-requests", "POST", {
            roomId, startAt: startAt.toISOString(), endAt: endAt.toISOString(), purpose: "Study 2"
        }, studentToken);
        if (bReq2.error !== "Room is not available for this time slot") throw new Error("Failed to detect conflict! Error was: " + bReq2.error);

        const sugg = await req(`/availability/suggestions?startAt=${startAt.toISOString()}&endAt=${endAt.toISOString()}&originalRoomId=${roomId}`, "GET", null, studentToken);
        if (!sugg.data) throw new Error("Suggestions failed");

        console.log("8. Notifications check");
        const notifs = await req("/notifications", "GET", null, studentToken);
        if (!notifs.data || notifs.data.length === 0) throw new Error("No notifications found");

        console.log("✅ All flows passed successfully!");
    } catch (e) {
        console.error("❌ Test Failed:", e.message);
        process.exit(1);
    }
}

run();
