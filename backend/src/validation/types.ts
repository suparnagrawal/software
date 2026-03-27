export interface BookingPayload {
    roomId: number;
    startAt: Date;
    endAt: Date;
    courseId?: number | null;
    studentCount?: number | null;
    requiredEquipment?: string[] | null;
}

export type ValidationErrorType =
    | "ROOM_CONFLICT"
    | "COURSE_CONFLICT"
    | "CAPACITY_ERROR"
    | "EQUIPMENT_ERROR";

export interface ValidationResult {
    valid: boolean;
    error?: {
        type: ValidationErrorType;
        message: string;
    };
}
