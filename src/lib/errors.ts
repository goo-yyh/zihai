export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export function isUserFacingError(error: unknown): error is UserFacingError {
  return error instanceof UserFacingError;
}

export function publicErrorMessage(error: unknown, fallback: string) {
  if (isUserFacingError(error)) return error.message;
  console.error(fallback, error);
  return fallback;
}
