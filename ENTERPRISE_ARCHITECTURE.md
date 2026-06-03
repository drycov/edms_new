# Enterprise Architecture Refactoring - Complete Implementation Guide

## Architecture Overview

The EDMS has been refactored into a scalable enterprise architecture following **Feature-Sliced Design (FSD)** and **Domain-Driven Design (DDD)** principles.

### Directory Structure

```
src/
├── app/                           # Application entry point
│   ├── providers/                 # Context providers
│   ├── router/                    # Route definitions
│   ├── layouts/                   # Layout components
│   └── index.tsx                  # Root component
│
├── shared/                        # Cross-cutting infrastructure
│   ├── api/
│   │   └── supabase.ts           # Supabase client (ONLY Supabase access point)
│   ├── lib/
│   │   ├── audit.service.ts      # Type-safe audit logging
│   │   ├── auth.service.ts       # Authorization & permissions
│   │   ├── repository.ts         # Base repository pattern
│   │   ├── query-utils.ts        # React Query utilities
│   │   ├── error-utils.ts        # Error handling
│   │   ├── utils.ts              # General utilities
│   │   └── i18n/                 # Internationalization
│   ├── hooks/                     # Shared React hooks
│   ├── ui/                        # Reusable UI components
│   └── types/                     # Shared TypeScript types
│
├── entities/                      # Domain entities (core business objects)
│   ├── document/
│   │   ├── model/
│   │   │   ├── document.ts       # Domain entity & value objects
│   │   │   └── document.mapper.ts # DTO ↔ Entity mapping
│   │   ├── api/
│   │   │   ├── document.repository.ts # Database access layer
│   │   │   └── document.queries.ts    # React Query hooks
│   │   ├── ui/
│   │   │   └── [Components]       # Domain-specific components
│   │   └── index.ts              # Public API
│   │
│   ├── workflow/
│   ├── task/
│   ├── notification/
│   ├── user/
│   ├── organization/
│   └── [other entities...]
│
├── features/                      # Feature modules (business actions)
│   ├── document-create/
│   │   ├── model/
│   │   │   ├── types.ts          # Feature-specific types
│   │   │   └── schema.ts         # Validation schema
│   │   ├── api/
│   │   │   └── create-document.mutation.ts # Mutation logic
│   │   └── ui/
│   │       └── CreateDocumentForm.tsx
│   │
│   ├── document-approve/
│   ├── workflow-publish/
│   ├── task-delegate/
│   └── [other features...]
│
├── widgets/                       # Composite UI components (business blocks)
│   ├── dashboard-stats/
│   ├── document-list/
│   ├── approval-list/
│   ├── header/
│   ├── sidebar/
│   └── [other widgets...]
│
└── pages/                         # Route views (composition)
    ├── documents/
    │   ├── index.tsx             # Main page (NO logic)
    │   └── [DocumentPage].tsx    # Route components
    │
    ├── dashboard/
    ├── approvals/
    ├── workflows/
    └── [other pages...]
```

## Core Principles

### 1. Layered Dependency Flow

```
Pages (UI composition)
  ↓ uses
Features (User actions)
  ↓ uses
Widgets (Business blocks)
  ↓ uses
Entities (Domain logic)
  ↓ uses
Shared (Infrastructure)

** PAGES MUST NEVER CALL SUPABASE DIRECTLY **
```

### 2. Repository Pattern

**All database access must go through repositories:**

```typescript
// ✗ BAD - Direct database access
export function MyComponent() {
  const { data } = useQuery({
    queryFn: async () => {
      return supabase.from('documents').select('*');
    }
  });
}

// ✓ GOOD - Via repository
export function MyComponent() {
  const { data } = useDocumentQueries.useList(filter);
}
```

### 3. DTO ↔ Entity Mapping

```typescript
// Database DTO (from Supabase)
{
  id: '123',
  title: 'Doc',
  created_at: '2024-01-01T00:00:00Z',
  document_type_id: null
}

        ↓ DocumentMapper.toDomain()

// Domain Entity (independent from DB schema)
{
  id: '123',
  title: 'Doc',
  createdAt: Date,
  documentTypeId: null
}
```

### 4. React Query Factory Pattern

```typescript
// Define query keys
const documentQueries = {
  all: () => ['documents'],
  list: (filter) => [...documentQueries.all(), 'list', filter],
  detail: (id) => [...documentQueries.all(), 'detail', id],
};

// Define hooks
const useDocumentQueries = {
  useList: (filter) => useQuery({ queryKey: documentQueries.list(filter), ... }),
  useById: (id) => useQuery({ queryKey: documentQueries.detail(id), ... }),
};

// Usage in components
const { data } = useDocumentQueries.useList(filter);
```

### 5. Centralized Authorization

```typescript
// ✗ BAD - Checking role in component
if (user.role === 'admin') { ... }

// ✓ GOOD - Using auth service
authService.assertPermission(
  context,
  Permission.MANAGE_USERS
);
```

### 6. Type-Safe Audit Logging

```typescript
// ✗ BAD - String-based audit
await createAuditLog('user_created', 'user_type', 'user', data);

// ✓ GOOD - Enum-based audit
await auditService.success(
  context,
  AuditAction.USER_CREATED,
  'user',
  userId,
  { email: user.email }
);
```

## Entity Implementation Template

### Step 1: Create Domain Model

```typescript
// entities/[entity]/model/[entity].ts
export interface [Entity] {
  id: string;
  // ... properties
}

export interface Create[Entity]Input {
  // ... input fields
}

export class [Entity]Entity implements [Entity] {
  // Business logic methods
  canPerformAction(): boolean {
    return !this.isDeleted;
  }
}
```

### Step 2: Create Mapper

```typescript
// entities/[entity]/model/[entity].mapper.ts
export class [Entity]Mapper {
  static toDomain(dto: DTO): [Entity] {
    // Convert DTO to domain entity
  }

  static toDTO(entity: [Entity]): Partial<DTO> {
    // Convert back to DTO
  }
}
```

### Step 3: Create Repository

```typescript
// entities/[entity]/api/[entity].repository.ts
export class [Entity]Repository extends BaseRepository<[Entity]> {
  protected query() {
    return supabase.from('[table_name]');
  }

  async findWithFilters(filter): Promise<[Entity][]> {
    // Query logic with proper filtering
  }
}
```

### Step 4: Create Query Factories

```typescript
// entities/[entity]/api/[entity].queries.ts
export const [entity]Queries = {
  all: () => ['[entities]'],
  list: (filter) => [...[entity]Queries.all(), 'list', filter],
};

export const use[Entity]Queries = {
  useList: (filter) => useQuery({ ... }),
  useById: (id) => useQuery({ ... }),
};

export const use[Entity]Mutations = {
  useCreate: () => useMutation({ ... }),
  useUpdate: () => useMutation({ ... }),
  useDelete: () => useMutation({ ... }),
};
```

### Step 5: Create Public API

```typescript
// entities/[entity]/index.ts
export * from './model/[entity]';
export * from './model/[entity].mapper';
export * from './api/[entity].repository';
export * from './api/[entity].queries';
```

## Feature Implementation Template

### Document Create Feature Example

```typescript
// features/document-create/
├── model/
│   ├── types.ts
│   └── schema.ts          # Validation (zod/yup)
├── api/
│   └── create-document.mutation.ts
└── ui/
    └── CreateDocumentForm.tsx
```

**API Layer:**
```typescript
// features/document-create/api/create-document.mutation.ts
export const useCreateDocumentMutation = () => {
  return useMutation({
    mutationFn: async (input: CreateDocumentInput) => {
      // 1. Check permission
      authService.assertPermission(context, Permission.CREATE_DOCUMENT);

      // 2. Call repository through entity query factories
      return useDocumentMutations.useCreate().mutate(input);

      // 3. Audit is handled in query factory
    },
  });
};
```

**UI Layer:**
```typescript
// features/document-create/ui/CreateDocumentForm.tsx
export function CreateDocumentForm() {
  const { mutate, isPending } = useCreateDocumentMutation();

  return (
    <Form onSubmit={(data) => mutate(data)}>
      {/* Form fields only - NO logic */}
    </Form>
  );
}
```

## Authorization & Permissions

### Permission Model

```typescript
enum Permission {
  // Document permissions
  CREATE_DOCUMENT = 'create_document',
  EDIT_DOCUMENT = 'edit_document',
  DELETE_DOCUMENT = 'delete_document',
  APPROVE_DOCUMENT = 'approve_document',
  SIGN_DOCUMENT = 'sign_document',
  // ... more permissions
}

enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  APPROVER = 'approver',
  CONTRIBUTOR = 'contributor',
  VIEWER = 'viewer',
}
```

### Permission Checks

```typescript
// In mutation
authService.assertPermission(context, Permission.CREATE_DOCUMENT);

// In component
if (!authService.hasPermission(context, Permission.EDIT_DOCUMENT)) {
  return <Unauthorized />;
}
```

## Audit Logging

### Standardized Audit Events

```typescript
enum AuditAction {
  DOCUMENT_CREATED = 'document_created',
  DOCUMENT_UPDATED = 'document_updated',
  DOCUMENT_DELETED = 'document_deleted',
  TASK_ASSIGNED = 'task_assigned',
  TASK_APPROVED = 'task_approved',
  // ... more actions
}
```

### Logging Pattern

```typescript
// In mutation success handler
await auditService.document(
  context,
  AuditAction.DOCUMENT_CREATED,
  document.id,
  { title: document.title, status: document.status }
);
```

## React Query Best Practices

### Cache Strategy

```typescript
const queryConfig = {
  staleTime: 1000 * 60 * 5,      // 5 minutes
  gcTime: 1000 * 60 * 30,        // 30 minutes (formerly cacheTime)
  refetchOnWindowFocus: false,
  retry: 1,
};
```

### Query Invalidation

```typescript
onSuccess: (data) => {
  // Invalidate specific queries
  queryClient.invalidateQueries({
    queryKey: documentQueries.lists(),
  });

  // Re-fetch immediately
  queryClient.refetchQueries({
    queryKey: documentQueries.detail(data.id),
  });
};
```

### Optimistic Updates

```typescript
return useMutation({
  mutationFn: updateDocument,
  onMutate: async (variables) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries({
      queryKey: documentQueries.detail(variables.id),
    });

    // Save previous data
    const previous = queryClient.getQueryData(
      documentQueries.detail(variables.id)
    );

    // Update cache optimistically
    queryClient.setQueryData(
      documentQueries.detail(variables.id),
      { ...previous, ...variables }
    );

    return { previous };
  },
  onError: (error, variables, context) => {
    // Revert on error
    if (context?.previous) {
      queryClient.setQueryData(
        documentQueries.detail(variables.id),
        context.previous
      );
    }
  },
});
```

## Error Handling

### Error Hierarchy

```typescript
ApiError              // General API errors (500, network, etc.)
├─ NotFoundError      // 404
├─ ValidationError    // 400 validation failures
└─ UnauthorizedError  // 401

DomainError          // Business logic violations
PermissionError      // Authorization failures
```

### Error Handling in Mutations

```typescript
return useMutation({
  mutationFn: async (input) => {
    try {
      return await documentRepository.createDocument(...);
    } catch (error) {
      if (error instanceof ValidationError) {
        // Handle validation errors
        toast.error('Validation Failed', error.details);
      } else if (error instanceof PermissionError) {
        // Handle permission errors
        toast.error('Access Denied', error.message);
      } else {
        // Handle general errors
        toast.error('Error', 'Please try again');
      }
      throw error;
    }
  },
});
```

## Refactoring Checklist

### For Each Entity:

- [ ] Created `model/[entity].ts` with domain types
- [ ] Created `model/[entity].mapper.ts` for DTO mapping
- [ ] Created `api/[entity].repository.ts` extending BaseRepository
- [ ] Created `api/[entity].queries.ts` with React Query hooks
- [ ] Created `index.ts` exporting public API
- [ ] Removed direct Supabase calls from old hooks
- [ ] Added permission checks to mutations
- [ ] Added audit logging to mutations
- [ ] Updated pages to use new entity queries

### For Each Feature:

- [ ] Created feature directory under `features/`
- [ ] Created `model/types.ts` and `schema.ts`
- [ ] Created `api/[feature].mutation.ts`
- [ ] Created `ui/` components
- [ ] Added permission checks
- [ ] Added audit logging
- [ ] Created feature index export

### For Pages:

- [ ] Removed ALL Supabase calls
- [ ] Removed ALL repository calls (use query factories)
- [ ] Removed ALL permission checks (use auth service)
- [ ] Removed ALL audit logging
- [ ] Updated to use entity queries
- [ ] Updated to use feature mutations
- [ ] Clean UI composition only

## Build & Testing

```bash
# Type check
npm run type-check

# Build
npm run build

# Lint
npm run lint

# Test (when tests are added)
npm run test
```

## Performance Optimizations

### Code Splitting

```typescript
// Use dynamic imports for route-level code splitting
const DocumentsPage = lazy(() => import('./pages/documents'));
const WorkflowsPage = lazy(() => import('./pages/workflows'));
```

### Memoization

```typescript
// Memoize expensive selectors
const selectDocumentCount = useMemo(
  () => documents.length,
  [documents]
);

// Memoize callbacks
const handleDelete = useCallback(
  (id) => deleteDocument(id),
  [deleteDocument]
);
```

### Virtual Lists

```typescript
// Use react-virtual for large lists
const rowVirtualizer = useVirtualizer({
  count: documents.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 35,
});
```

## Migration Strategy

### Phase 1: Foundation (Already Done)
- [x] Create base repository pattern
- [x] Create authorization service
- [x] Create audit service
- [x] Create document entity with repository & queries

### Phase 2: Complete Entity Layer
- [ ] Create repositories for all entities (workflow, task, etc.)
- [ ] Create query factories for all entities
- [ ] Create mappers for all entities

### Phase 3: Feature Layer
- [ ] Create feature modules for major operations
- [ ] Add permission checks to all features
- [ ] Add audit logging to all features

### Phase 4: Page Refactoring
- [ ] Update all pages to use entity queries
- [ ] Remove direct Supabase calls
- [ ] Remove business logic from pages

### Phase 5: Testing & Optimization
- [ ] Add unit tests for repositories
- [ ] Add integration tests for query factories
- [ ] Implement code splitting
- [ ] Optimize React Query cache

## Next Steps

1. **Complete Document Entity** (Reference implementation)
   - Apply Document repository pattern to all pages

2. **Create Other Repositories**
   - WorkflowRepository
   - TaskRepository
   - NotificationRepository
   - etc.

3. **Refactor Features**
   - Create feature modules with mutations
   - Add permission checks
   - Add audit logging

4. **Update Pages**
   - Replace all old logic with new entity queries
   - Remove Supabase calls
   - Keep pages for composition only

5. **Add Tests**
   - Unit tests for repositories
   - Integration tests for queries
   - Component tests for pages

## Maintenance

### Adding New Feature

1. Create feature directory
2. Add types and validation
3. Create mutation in API
4. Create UI component
5. Add to feature index
6. Use in page

### Adding New Entity

1. Create domain model
2. Create mapper
3. Extend BaseRepository
4. Create query factories
5. Create public index
6. Update entity exports

### Modifying Authorization

1. Add permission to Permission enum
2. Add role → permission mapping
3. Add check to mutation
4. Test access control

---

This architecture provides:

✓ **Scalability** - Easy to add new entities and features
✓ **Type Safety** - Full TypeScript coverage
✓ **Separation of Concerns** - Clear layer boundaries
✓ **Testability** - Mockable repositories and services
✓ **Maintainability** - Consistent patterns throughout
✓ **Performance** - Optimized caching and query strategy
✓ **Security** - Centralized authorization and audit logging
