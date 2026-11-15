import type { DataRepository } from './repository';
import { MockRepository } from './mock/mockRepository';

// نقطة التبديل الوحيدة: لاحقاً → new SupabaseRepository(client)
export const repo: DataRepository = new MockRepository();
export { DEMO_USERS } from './mock/seed';
