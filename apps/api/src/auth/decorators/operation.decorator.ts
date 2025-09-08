import { SetMetadata } from '@nestjs/common';

export const OPERATION_KEY = 'operation';
export const Operation = (operation: string) =>
  SetMetadata(OPERATION_KEY, operation);
