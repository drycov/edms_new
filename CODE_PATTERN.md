# Code Pattern & Refactoring Guide

## Established Code Pattern

This document outlines the standardized patterns used throughout the EDMS project codebase.

### 1. Entity Hook Pattern

All entity-level hooks follow a consistent React Query pattern:

```typescript
// Entity hooks location: src/entities/[entity-name]/index.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUser, getCurrentUserOrganization, createAuditLog } from '@/shared/lib/query-utils';

// Query Hooks
export function useEntity(id: string) {
  return useQuery({
    queryKey: ['entity', id],
    queryFn: async () => {
      // Fetch logic
    },
    enabled: !!id,
  });
}

// Mutation Hooks
export function useCreateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: ICreateEntityInput) => {
      const user = await getCurrentUser();
      // Create logic with audit logging
      await createAuditLog('entity_created', 'category', 'entity_type', { /* data */ });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity'] });
    },
  });
}
```

### 2. Query Utilities

Location: `src/shared/lib/query-utils.ts`

**Key Functions:**

- `getCurrentUser()`: Gets current authenticated user
- `getCurrentUserOrganization()`: Gets user and organization context
- `createAuditLog()`: Creates standardized audit entries
- `createQueryOptions()`: Generates query configuration
- `createMutationOptions()`: Generates mutation configuration

### 3. Error Handling

Location: `src/shared/lib/error-utils.ts`

**Key Functions:**

- `handleError()`: Normalizes error messages
- `showErrorToast()`: Displays error notifications
- `showSuccessToast()`: Displays success notifications
- `createAppError()`: Creates typed error instances

### 4. Authentication Flow

All entity hooks use the standardized authentication pattern:

```typescript
// Instead of:
const user = (await supabase.auth.getUser()).data.user;
if (!user) throw new Error('Not authenticated');

// Use:
const user = await getCurrentUser(); // Handles all checks internally
```

### 5. Query Key Strategy

Query keys follow a hierarchical pattern:

- Top level: Entity type (`'documents'`, `'workflows'`, etc.)
- Next level: Specific resource ID or filter (`documentId`, `search`)
- Nested: Sub-resources (`['document-versions', id]`)

```typescript
// Examples:
queryKey: ['documents', search, statusFilter]
queryKey: ['document-versions', documentId]
queryKey: ['document-relations', documentId]
queryKey: ['document-comments', documentId]
```

### 6. Mutation Success Handlers

All mutations follow this pattern:

```typescript
onSuccess: (data, variables) => {
  // Invalidate related queries based on what was changed
  queryClient.invalidateQueries({ queryKey: ['document', variables.documentId] });
  queryClient.invalidateQueries({ queryKey: ['document-versions', variables.documentId] });
  
  // Show success notification
  showSuccessToast('Success', 'Operation completed');
},
```

### 7. Error Handling in Mutations

All mutations should have error handling:

```typescript
mutationFn: async (variables) => {
  try {
    // Operation logic
    if (error) throw error;
  } catch (error) {
    showErrorToast(error, 'Failed to complete operation');
    throw error;
  }
},
```

## Refactored Entities

### Entities Refactored

1. **Relations** (`src/entities/relations/index.ts`)
   - `useDocumentRelations()` - Query hook
   - `useCreateRelation()` - Mutation hook with audit logging
   - `useDeleteRelation()` - Mutation hook
   - `useSearchDocumentsForRelation()` - Query hook

2. **Versions** (`src/entities/version/index.ts`)
   - `useDocumentVersions()` - Query hook
   - `useCreateVersion()` - Mutation hook with audit logging
   - `useRestoreVersion()` - Mutation hook with auto-save
   - `useCompareVersions()` - Query hook

3. **Delegation** (`src/entities/delegation/index.ts`)
   - `useDelegateTask()` - Mutation hook with event creation
   - `useReassignTask()` - Mutation hook with audit logging
   - `useDelegatableUsers()` - Query hook

4. **Comments** (`src/entities/comment/index.ts`)
   - `useDocumentComments()` - Query hook
   - `useCreateComment()` - Mutation hook with audit logging
   - `useUpdateComment()` - Mutation hook with audit logging
   - `useDeleteComment()` - Mutation hook with audit logging
   - `useResolveComment()` - Mutation hook with audit logging

### Key Changes Made

1. **Centralized Authentication**
   - All entities now use `getCurrentUser()` and `getCurrentUserOrganization()`
   - Eliminates repetitive auth checks

2. **Consistent Audit Logging**
   - All mutations now create audit logs using `createAuditLog()`
   - Standardized action naming: `entity_action` format

3. **Improved Query Invalidation**
   - All mutations properly invalidate related queries
   - Prevents stale data issues

4. **Cleaner Code Structure**
   - Removed inline comments
   - Removed unnecessary variable names
   - More concise and readable

5. **Error Handling Utilities**
   - Created dedicated error handling module
   - Standardized error messages
   - Consistent toast notifications

## Page Component Pattern

All page components follow this pattern:

```typescript
// src/pages/[feature]/index.tsx

import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function FeaturePage() {
  const { t } = useTranslation(); // i18n support
  const navigate = useNavigate(); // Navigation
  
  // Queries
  const { data, isLoading, error } = useQuery({ /* ... */ });
  
  // Mutations
  const mutation = useMutation({ /* ... */ });
  
  // Handlers
  const handleAction = () => {
    mutation.mutate({ /* data */ });
  };
  
  // Render
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;
  
  return (
    <div className="space-y-6">
      {/* Page content */}
    </div>
  );
}
```

## Implementation Guidelines

### When Creating New Entities

1. Create hook file in `src/entities/[entity-name]/index.ts`
2. Use `getCurrentUser()` for authentication
3. Use `createAuditLog()` for all mutations
4. Import from `@/shared/lib/query-utils`
5. Follow the established query key pattern
6. Implement proper invalidation in `onSuccess`

### When Updating Page Components

1. Use the established page pattern
2. Implement loading/error/empty states
3. Use i18n for all user-facing text
4. Use error utilities for notifications
5. Keep mutations in separate hooks
6. Don't mix concerns (UI + logic)

### Naming Conventions

- Query hooks: `use[Entity]()`
- Mutation hooks: `use[Action][Entity]()`
- Query keys: `['entity-name', ...]`
- Audit actions: `entity_action_format`
- Types: `PascalCase`
- Variables: `camelCase`

## Migration to New Pattern

To migrate existing code to this pattern:

1. Move all `supabase.auth.getUser()` calls to use `getCurrentUser()`
2. Replace inline audit logs with `createAuditLog()`
3. Consolidate similar mutations
4. Use query key hierarchy
5. Add proper error handling with utilities
6. Ensure all mutations invalidate appropriate queries

## Benefits of This Pattern

1. **Consistency** - All entities follow the same pattern
2. **Maintainability** - Easy to locate and update code
3. **Reusability** - Common utilities reduce duplication
4. **Type Safety** - Full TypeScript support throughout
5. **Scalability** - Easy to add new entities
6. **Testability** - Clear separation of concerns
7. **Performance** - Proper query caching and invalidation
8. **Auditability** - All mutations are logged consistently
