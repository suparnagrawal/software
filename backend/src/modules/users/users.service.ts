import * as queries from "./users.queries";
import { NotFoundError, ValidationError } from "../../lib/errors";
import bcrypt from "bcrypt";

const VALID_ROLES = ["ADMIN", "STAFF", "FACULTY", "STUDENT"] as const;

export async function listUsers() {
    return queries.getAllUsers();
}

export async function getUser(id: number) {
    const user = await queries.getUserById(id);
    if (!user) throw new NotFoundError("User");
    return user;
}

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
}) {
    if (!data.name?.trim()) throw new ValidationError("Name is required");
    if (!data.email?.trim()) throw new ValidationError("Email is required");
    if (!data.password) throw new ValidationError("Password is required");
    if (!VALID_ROLES.includes(data.role as any))
        throw new ValidationError("Invalid role");

    const passwordHash = await bcrypt.hash(data.password, 10);

    return queries.insertUser({
        name: data.name.trim(),
        email: data.email.trim(),
        passwordHash,
        role: data.role as (typeof VALID_ROLES)[number],
    });
}

export async function updateUser(
    id: number,
    data: { name?: string | undefined; email?: string | undefined; role?: string | undefined }
) {
    if (data.role && !VALID_ROLES.includes(data.role as any)) {
        throw new ValidationError("Invalid role");
    }

    const result = await queries.updateUser(id, {
        name: data.name?.trim(),
        email: data.email?.trim(),
        role: data.role as any,
    });
    if (!result) throw new NotFoundError("User");
    return result;
}

export async function deleteUser(id: number) {
    const result = await queries.deleteUser(id);
    if (!result) throw new NotFoundError("User");
    return result;
}
