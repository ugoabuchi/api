import {Middleware, ExpressMiddlewareInterface} from "routing-controllers";

@Middleware({ type: "before" })
export class LoggingHandler implements ExpressMiddlewareInterface {
    
    use(request: any, response: any, next: (err: any) => any): void {
        console.log('[' + request.method + ']', request.originalUrl) 
        next(null);
    }

}