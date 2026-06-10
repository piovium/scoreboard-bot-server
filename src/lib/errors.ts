export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class UpstreamError extends AppError {
  public readonly retcode: number | undefined;

  constructor(message: string = 'Upstream service unavailable', retcode?: number) {
    super(message, 502, 'UPSTREAM_ERROR');
    this.name = 'UpstreamError';
    this.retcode = retcode;
  }
}

export class SessionNotFoundError extends AppError {
  constructor(message: string = 'Session not found') {
    super(message, 401, 'SESSION_NOT_FOUND');
    this.name = 'SessionNotFoundError';
  }
}

export class SessionExpiredError extends AppError {
  constructor(message: string = 'Session expired') {
    super(message, 401, 'SESSION_EXPIRED');
    this.name = 'SessionExpiredError';
  }
}

export class NotLoggedInError extends AppError {
  constructor(message: string = 'User not logged in') {
    super(message, 401, 'NOT_LOGGED_IN');
    this.name = 'NotLoggedInError';
  }
}

export class RenderError extends AppError {
  constructor(message: string = 'Image rendering failed') {
    super(message, 500, 'RENDER_ERROR');
    this.name = 'RenderError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
