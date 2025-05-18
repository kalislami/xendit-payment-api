import { ZodSchema } from 'zod';

export interface ValidationResponse {
    isValid: boolean;
    error: string | null;
    validData: unknown;
}

export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResponse {
    const result = schema.safeParse(data);

    if (result.success) {
        return {
            isValid: true,
            error: null,
            validData: result.data
        };
    }

    const simplified = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
    }));

    const stringErr = simplified.map(item => `${item.field} is ${item.message}`).join(', ');

    return {
        isValid: false,
        error: stringErr,
        validData: null
    };
}
