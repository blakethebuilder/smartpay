import { Request } from 'express';
import { RequestContext } from '../types';

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
      tenantQuery?: (table: string) => any;
    }
  }
}
