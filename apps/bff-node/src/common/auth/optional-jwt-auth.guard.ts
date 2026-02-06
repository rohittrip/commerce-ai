import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard - allows both authenticated and unauthenticated requests.
 * If a valid JWT is present, req.user will be populated.
 * If no JWT or invalid JWT, req.user will be null (guest mode).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Try to authenticate
      await super.canActivate(context);
    } catch {
      // If authentication fails, allow the request to proceed as guest
      // req.user will be undefined/null
    }
    return true; // Always allow the request
  }

  handleRequest(err: any, user: any) {
    // Don't throw error if no user - just return null for guest
    if (err || !user) {
      return null;
    }
    return user;
  }
}
