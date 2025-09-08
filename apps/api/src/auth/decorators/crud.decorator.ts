import { SetMetadata } from '@nestjs/common';

export type CrudOperation = 'create' | 'read' | 'update' | 'delete' | 'list';

export const CRUD_KEY = 'crud';
export const CRUD = (operation: CrudOperation) =>
  SetMetadata(CRUD_KEY, operation);
