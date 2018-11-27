class CustomError extends Error {
  code: string;

  constructor(code, message) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }

    // Custom error properties
    this.code = code;
  }
}

export default CustomError;
