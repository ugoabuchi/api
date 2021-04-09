import { Middleware, ExpressErrorMiddlewareInterface } from "routing-controllers";
import { HttpError } from "routing-controllers";

@Middleware({ type: "after" })
export class ErrorHandler implements ExpressErrorMiddlewareInterface {

	error(err: any, req: any, res: any, next: (err: any) => any) {
		if (err instanceof HttpError) {
			if (req.user) {
				let label = `${req.user.userGroup} error`.toUpperCase();
				console.log(label, `(${req.user.email}):`, err.httpCode, err.message);
			} else {
				console.log("error", err.httpCode, err.message);
			}

			if (res.headersSent) { // important to allow default error handler to close connection if headers already sent
				return next(err)
			}
			res.set("Content-Type", "application/json")
			res.status(err.httpCode)
			res.json({
				status: err.httpCode,
				message: err.message,
			});
		}
		next(err);
	}

}