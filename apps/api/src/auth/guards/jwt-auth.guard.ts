import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface IRequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<IRequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (token == null || token === '') {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(
    request: IRequestWithUser
  ): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? ['', ''];
    return type === 'Bearer' && token != null && token !== ''
      ? token
      : undefined;
  }
}
