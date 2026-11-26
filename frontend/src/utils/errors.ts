import axios from "axios";

export type FieldErrors = Record<string, string[]>;

export interface ParsedError {
    message: string | null; // general problem, like for wrong passwords
    fields: FieldErrors; // per-field problems from a 400
}

export function parseApiError(error: unknown): ParsedError {
    if (!axios.isAxiosError(error)) {
        return { message: "Something went wrong.", fields: {} };
    }
    if (!error.response) {
        return { message: "Can't reach the server.", fields: {} };
    }
    if (error.response.status === 429) {
        const wait = Number(error.response.headers["retry-after"]);
        return {
        message:
            Number.isFinite(wait) && wait > 0
            ? `Too many attempts. Please try again in ${wait} seconds.`
            : "Too many attempts. Please wait a moment and try again.",
        fields: {},
    };
  }
    const data: unknown = error.response.data;
    if (error.response.status === 400 && typeof data === "object" && data !== null) {
        if ("detail" in data && typeof data.detail === "string") {
            return { message: data.detail, fields: {} };
        }
        return { message: null, fields: data as FieldErrors };
    }
    if (typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string") {
        return { message: data.detail, fields: {} };
    }
    return { message: "Something went wrong.", fields: {} };
}

export function isNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
