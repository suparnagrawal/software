import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function getAllUsers() {
    return db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
        })
        .from(users);
}

export async function getUserById(id: number) {
    const rows = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
    return rows[0] ?? null;
}

export async function insertUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: "ADMIN" | "STAFF" | "FACULTY" | "STUDENT";
}) {
    const result = await db.insert(users).values(data).returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
    });
    return result[0]!;
}

export async function updateUser(
    id: number,
    data: { name?: string | undefined; email?: string | undefined; role?: "ADMIN" | "STAFF" | "FACULTY" | "STUDENT" | undefined }
) {
    const setValues: any = {};
    if (data.name !== undefined) setValues.name = data.name;
    if (data.email !== undefined) setValues.email = data.email;
    if (data.role !== undefined) setValues.role = data.role;

    const result = await db
        .update(users)
        .set(setValues)
        .where(eq(users.id, id))
        .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
        });
    return result[0] ?? null;
}

export async function deleteUser(id: number) {
    const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });
    return result[0] ?? null;
}
