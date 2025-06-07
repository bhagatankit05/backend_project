class ApiResponse{
    constructor(statusCode , data , message = "success", errors = [], stack = "") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode <400;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
export { ApiResponse };