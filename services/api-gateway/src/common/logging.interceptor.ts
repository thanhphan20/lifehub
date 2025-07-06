import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    let correlationId = req.headers["x-correlation-id"];
    if (!correlationId) {
      correlationId = uuidv4();
      req.headers["x-correlation-id"] = correlationId;
    }
    res.setHeader("x-correlation-id", correlationId);
    const method = req.method;
    const url = req.url;
    const now = Date.now();

    this.logger.log(`Incoming Request: ${method} ${url}`, { correlationId });

    return next.handle().pipe(
      tap((data) => {
        const statusCode = res.statusCode;
        const elapsed = Date.now() - now;
        this.logger.log(`Response: ${method} ${url} ${statusCode} - ${elapsed}ms`, { correlationId });
      })
    );
  }
}
