# Services Layer

The `src/services/` directory contains centralized business logic and data-access functions for domain entities.

## Service Pattern

When implementing services for future features:

1. **Encapsulation**: Encapsulate all database operations (queries, inserts, updates, deletes) in service functions.
2. **Reusable**: Allow services to be called by Server Actions, Route Handlers, and Server Components.
3. **No Direct UI Queries**: UI components must never execute raw database queries.
4. **Selective Columns**: Always query explicit columns (`.select('id, name, ...')`) rather than `.select('*')`.
5. **Standard Return Shape**: Return a consistent structure:

```typescript
export interface ServiceResponse<T> {
  data: T | null;
  error: {
    message: string;
    code?: string;
  } | null;
}
```
