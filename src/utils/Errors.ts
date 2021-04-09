import {HttpError} from "routing-controllers";

export class TSError extends HttpError {
    public message: string;
    public args: any[];
    public errorCode: number;

    constructor(errorCode: number, message: string, args: any[] = []) {
        super(errorCode);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
        this.message = message;
        this.args = args; // can be used for internal logging
        this.errorCode = errorCode;
    }

    toJSON() {
        return {
            status: this.httpCode,
            failedOperation: this.message
        }
    }
}

export class ForbiddenError extends TSError {
    constructor(message: string, args: any[] = []) {
        super(403, message, args);
    }
}

export class UnauthorizedError extends TSError {
    constructor(message: string, args: any[] = []) {
        super(401, message, args);
    }
}

export class ConflictError extends TSError {
    constructor(message: string, args: any[] = []) {
        super(409, message, args);
    }
}

export class UnknownError extends TSError {
    constructor(message: string, args: any[] = []) {
        super(520, message, args);
    }
}

export class NotFoundError extends TSError {
    constructor(message: string, args: any[] = []) {
        super(404, message, args);
    }
}

export class PreconditionError extends TSError {
    constructor(message: string, args: any[] = []) {
        super(412, message, args);
    }
}

export class ValidationError extends TSError {
    constructor(operationName: string, args: any[] = []) {
        super(400, operationName, args);
    }
}




export default class Errors {
    static log(msg: string, level:string = 'error') {
        console.log(level + ':', msg)
    }
}