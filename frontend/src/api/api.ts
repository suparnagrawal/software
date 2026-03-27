const API_BASE_URL = "/api";
const AUTH_TOKEN_KEY = "authToken";
const AUTH_USER_KEY = "authUser";

/* ===== Types ===== */

export type UserRole = "ADMIN" | "STAFF" | "FACULTY" | "STUDENT";

export type AuthUser = {
  id: number;
  name: string;
  role: UserRole;
};

export type Building = {
  id: number;
  name: string;
};

export type Room = {
  id: number;
  name: string;
  buildingId: number;
  capacity?: number;
  equipment?: string[];
};

export type RoomUnavailability = {
  id: number;
  roomId: number;
  startAt: string;
  endAt: string;
  reason: string;
};

export type BookingStatus =
  | "PENDING_FACULTY"
  | "PENDING_STAFF"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type BookingRequest = {
  id: number;
  userId: number | null;
  roomId: number;
  startAt: string;
  endAt: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
  courseId?: number | null;
  studentCount?: number | null;
  requiredEquipment?: string[] | null;
  type?: "NEW_BOOKING" | "SLOT_CHANGE" | "ROOM_CHANGE";
  originalBookingId?: number | null;
};

export type Booking = {
  id: number;
  roomId: number;
  startAt: string;
  endAt: string;
  requestId: number | null;
  courseId?: number | null;
};

export type Notification = {
  id: number;
  userId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedRequestId?: number | null;
};

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type AvailabilityRoom = {
  id: number;
  name: string;
  isAvailable: boolean;
};

export type AvailabilityBuilding = {
  buildingId: number;
  buildingName: string;
  rooms: AvailabilityRoom[];
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
  suggestions?: Room[];
};

export class ApiError extends Error {
  public suggestions?: Room[];
  constructor(message: string, suggestions?: Room[]) {
    super(message);
    this.name = "ApiError";
    this.suggestions = suggestions;
  }
}

type BuildingsListResponse = {
  data: Building[];
};

/* ===== Auth Helpers ===== */

let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorizedCallback = cb;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

/* ===== Core Request ===== */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const isFormData = init?.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? ((await response.json()) as unknown) : null;

  if (!response.ok) {
    // Auto-logout on 401
    if (response.status === 401) {
      clearAuth();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    const apiPayload = payload as ApiErrorPayload | null;
    const message =
      apiPayload?.error ??
      apiPayload?.message ??
      httpErrorMessage(response.status);
    throw new ApiError(message, apiPayload?.suggestions);
  }

  return payload as T;
}

function httpErrorMessage(status: number): string {
  switch (status) {
    case 400: return "Invalid request";
    case 401: return "Session expired. Please log in again.";
    case 403: return "You don't have permission to perform this action";
    case 404: return "Resource not found";
    case 409: return "Conflict with existing data";
    default: return `Request failed (${status})`;
  }
}

/* ===== Auth ===== */

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem(AUTH_TOKEN_KEY, response.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));

  return response.user;
}

/* ===== Buildings ===== */

export async function getBuildings(): Promise<Building[]> {
  const response = await request<BuildingsListResponse>("/buildings");
  return response.data;
}

export async function createBuilding(name: string): Promise<Building> {
  const response = await request<{ data: Building }>("/buildings", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return response.data;
}

export async function updateBuilding(id: number, name: string): Promise<Building> {
  const response = await request<{ data: Building }>(`/buildings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return response.data;
}

export async function deleteBuilding(id: number): Promise<void> {
  await request<{ message: string }>(`/buildings/${id}`, {
    method: "DELETE",
  });
}

/* ===== Rooms ===== */

export async function getRooms(buildingId?: number): Promise<Room[]> {
  const query =
    buildingId === undefined ? "" : `?buildingId=${encodeURIComponent(String(buildingId))}`;
  return request<Room[]>(`/rooms${query}`);
}

export async function createRoom(
  name: string,
  buildingId: number,
  capacity?: number,
  equipment?: string[]
): Promise<Room> {
  return request<Room>("/rooms", {
    method: "POST",
    body: JSON.stringify({ name, buildingId, capacity, equipment }),
  });
}

export async function updateRoom(
  id: number,
  name: string,
  capacity?: number,
  equipment?: string[]
): Promise<Room> {
  const response = await request<{ data: Room }>(`/rooms/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, capacity, equipment }),
  });
  return response.data;
}

export async function deleteRoom(id: number): Promise<void> {
  await request<{ message: string }>(`/rooms/${id}`, {
    method: "DELETE",
  });
}

export async function getRoomAvailability(
  roomId: number,
  startAt: string,
  endAt: string
): Promise<{ id: number; startAt: string; endAt: string }[]> {
  const params = new URLSearchParams({ startAt, endAt });
  return request(`/rooms/${roomId}/availability?${params.toString()}`);
}

/* ===== Room Unavailability ===== */

export async function getRoomUnavailability(roomId: number): Promise<RoomUnavailability[]> {
  return request<RoomUnavailability[]>(`/rooms/${roomId}/unavailability`);
}

export async function createRoomUnavailability(
  roomId: number,
  input: { startAt: string; endAt: string; reason: string }
): Promise<RoomUnavailability> {
  return request<RoomUnavailability>(`/rooms/${roomId}/unavailability`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteRoomUnavailability(unavailabilityId: number): Promise<void> {
  await request<{ message: string }>(`/rooms/unavailability/${unavailabilityId}`, {
    method: "DELETE",
  });
}

/* ===== Booking Requests ===== */

export async function getBookingRequests(status?: BookingStatus): Promise<BookingRequest[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<BookingRequest[]>(`/booking-requests${query}`);
}

export async function createBookingRequest(input: {
  roomId: number;
  startAt: string;
  endAt: string;
  purpose: string;
  courseId?: number;
  studentCount?: number;
  requiredEquipment?: string[];
  type?: "NEW_BOOKING" | "SLOT_CHANGE" | "ROOM_CHANGE";
  originalBookingId?: number;
}): Promise<BookingRequest> {
  return request<BookingRequest>("/booking-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function approveBookingRequest(id: number): Promise<void> {
  await request<unknown>(`/booking-requests/${id}/approve`, {
    method: "POST",
  });
}

export async function forwardBookingRequest(id: number): Promise<void> {
  await request<unknown>(`/booking-requests/${id}/forward`, {
    method: "POST",
  });
}

export async function rejectBookingRequest(id: number): Promise<void> {
  await request<unknown>(`/booking-requests/${id}/reject`, {
    method: "POST",
  });
}

export async function cancelBookingRequest(id: number): Promise<void> {
  await request<unknown>(`/booking-requests/${id}/cancel`, {
    method: "POST",
  });
}

/* ===== Bookings ===== */

export async function getBookings(filters?: {
  roomId?: number;
  buildingId?: number;
  startAt?: string;
  endAt?: string;
}): Promise<Booking[]> {
  const params = new URLSearchParams();
  if (filters?.roomId !== undefined) params.set("roomId", String(filters.roomId));
  if (filters?.buildingId !== undefined) params.set("buildingId", String(filters.buildingId));
  if (filters?.startAt) params.set("startAt", filters.startAt);
  if (filters?.endAt) params.set("endAt", filters.endAt);
  const qs = params.toString();
  return request<Booking[]>(`/bookings${qs ? `?${qs}` : ""}`);
}

export async function createBooking(input: {
  roomId: number;
  startAt: string;
  endAt: string;
  courseId?: number;
}): Promise<Booking> {
  return request<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteBooking(id: number): Promise<void> {
  await request<void>(`/bookings/${id}`, {
    method: "DELETE",
  });
}

/* ===== Availability ===== */

export async function getAvailability(
  startAt: string,
  endAt: string,
  buildingId?: number
): Promise<AvailabilityBuilding[]> {
  const params = new URLSearchParams({ startAt, endAt });
  if (buildingId !== undefined) params.set("buildingId", String(buildingId));
  return request<AvailabilityBuilding[]>(`/availability?${params.toString()}`);
}

export async function getSuggestions(
  startAt: string,
  endAt: string,
  capacity?: number,
  equipment?: string[]
): Promise<Room[]> {
  const params = new URLSearchParams({ startAt, endAt });
  if (capacity !== undefined) params.set("capacity", String(capacity));
  if (equipment && equipment.length > 0) {
    equipment.forEach((eq) => params.append("equipment", eq));
  }
  return request<Room[]>(`/availability/suggestions?${params.toString()}`);
}

/* ===== Users ===== */

export async function getUsers(): Promise<User[]> {
  return request<User[]>("/users");
}

export async function createUser(input: { name: string; email: string; role: UserRole; password?: string }): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUser(id: number, input: Partial<User>): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteUser(id: number): Promise<void> {
  await request<void>(`/users/${id}`, {
    method: "DELETE",
  });
}

/* ===== Notifications ===== */

export async function getNotifications(): Promise<Notification[]> {
  return request<Notification[]>("/notifications");
}

export async function markNotificationRead(id: number): Promise<Notification> {
  return request<Notification>(`/notifications/${id}/read`, {
    method: "POST",
  });
}

/* ===== Timetable ===== */

export type SlotSystem = {
  id: number;
  name: string;
};

export async function getSlotSystems(): Promise<SlotSystem[]> {
  return request<SlotSystem[]>("/timetable/systems");
}

export async function createSlotSystem(name: string): Promise<SlotSystem> {
  return request<SlotSystem>("/timetable/systems", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function addSlot(systemId: number, name: string, dayOfWeek: number, startTime: string, endTime: string): Promise<void> {
  await request(`/timetable/systems/${systemId}/slots`, {
    method: "POST",
    body: JSON.stringify({ name, dayOfWeek, startTime, endTime }),
  });
}

export async function uploadTimetable(
  slotSystemId: number,
  semesterStart: string,
  semesterEnd: string,
  holidays: string,
  file: File
): Promise<{ message: string; successCount: number; injectionErrors: string[] }> {
  const formData = new FormData();
  formData.append("slotSystemId", String(slotSystemId));
  formData.append("semesterStart", semesterStart);
  formData.append("semesterEnd", semesterEnd);
  formData.append("holidays", holidays);
  formData.append("file", file);

  return request("/timetable/upload", {
    method: "POST",
    body: formData,
  });
}