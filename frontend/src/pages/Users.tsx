import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createUser, deleteUser, getUsers, updateUser } from "../api/api";
import type { User, UserRole } from "../api/api";
import { useAuth } from "../auth/AuthContext";

export function UsersPage() {
    const { user } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newRole, setNewRole] = useState<UserRole>("STUDENT");
    const [newPassword, setNewPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState<UserRole>("STUDENT");
    const [isUpdating, setIsUpdating] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            setUsers(await getUsers());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadUsers();
    }, []);

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
            setError("Name, email, and password are required");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await createUser({ name: newName.trim(), email: newEmail.trim(), role: newRole, password: newPassword });
            setNewName("");
            setNewEmail("");
            setNewPassword("");
            setNewRole("STUDENT");
            await loadUsers();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create user");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        setError(null);
        try {
            await deleteUser(id);
            await loadUsers();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete user");
        } finally {
            setDeletingId(null);
        }
    };

    const startEdit = (u: User) => {
        setEditingUserId(u.id);
        setEditName(u.name);
        setEditRole(u.role);
    };

    const cancelEdit = () => {
        setEditingUserId(null);
    };

    const handleUpdate = async (id: number) => {
        setIsUpdating(true);
        setError(null);
        try {
            await updateUser(id, { name: editName, role: editRole });
            await loadUsers();
            setEditingUserId(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update user");
        } finally {
            setIsUpdating(false);
        }
    };

    if (user?.role !== "ADMIN") {
        return <div className="alert alert-error">Access denied. Admins only.</div>;
    }

    return (
        <section>
            <div className="page-header">
                <h2>Users Management</h2>
                <p>Manage users, assign roles</p>
            </div>

            <form className="card section-gap" onSubmit={handleCreate}>
                <div className="card-header">
                    <h3>Create User</h3>
                </div>
                <div className="form-row">
                    <div className="form-field">
                        <label htmlFor="newUserName">Name</label>
                        <input
                            id="newUserName"
                            className="input"
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="newUserEmail">Email</label>
                        <input
                            id="newUserEmail"
                            className="input"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="newUserPassword">Password</label>
                        <input
                            id="newUserPassword"
                            className="input"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="newUserRole">Role</label>
                        <select
                            id="newUserRole"
                            className="input"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as UserRole)}
                            disabled={isSubmitting}
                        >
                            <option value="STUDENT">STUDENT</option>
                            <option value="FACULTY">FACULTY</option>
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>
                </div>
            </form>

            <div className="section-gap">
                <h3>System Users</h3>
                {error && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                        <div className="loading-spinner"></div>
                        <span style={{ marginLeft: "1rem" }}>Loading users...</span>
                    </div>
                ) : users.length === 0 ? (
                    <p className="empty-text">No users found.</p>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => {
                                const isDeleting = deletingId === u.id;
                                const isEditing = editingUserId === u.id;

                                if (isEditing) {
                                    return (
                                        <tr key={u.id} style={{ backgroundColor: "var(--surface-50)" }}>
                                            <td>
                                                <input className="input" type="text" value={editName} onChange={e => setEditName(e.target.value)} disabled={isUpdating} />
                                            </td>
                                            <td className="text-muted">{u.email}</td>
                                            <td>
                                                <select className="input" value={editRole} onChange={e => setEditRole(e.target.value as UserRole)} disabled={isUpdating}>
                                                    <option value="STUDENT">STUDENT</option>
                                                    <option value="FACULTY">FACULTY</option>
                                                    <option value="STAFF">STAFF</option>
                                                    <option value="ADMIN">ADMIN</option>
                                                </select>
                                            </td>
                                            <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                                    <button className="btn btn-success btn-sm" onClick={() => void handleUpdate(u.id)} disabled={isUpdating}>
                                                        {isUpdating ? "Saving..." : "Save"}
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={isUpdating}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={u.id}>
                                        <td><strong>{u.name}</strong></td>
                                        <td>{u.email}</td>
                                        <td><span className="badge badge-pending-staff">{u.role}</span></td>
                                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button className="btn btn-primary btn-sm" onClick={() => startEdit(u)} disabled={isDeleting}>
                                                    Edit
                                                </button>
                                                {u.id !== user?.id && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm"
                                                        disabled={isDeleting}
                                                        onClick={() => void handleDelete(u.id)}
                                                    >
                                                        {isDeleting ? "Deleting…" : "Delete"}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
}
