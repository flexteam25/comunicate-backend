import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentAdminPayload {
  adminId: string;
  email: string;
  tokenId: string;
  isSuperAdmin: boolean;
}

export const CurrentAdmin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentAdminPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.admin;
  },
);

