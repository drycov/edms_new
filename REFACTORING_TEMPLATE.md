# Page Refactoring Template

## Step-by-Step Guide to Refactor Pages

### 1. Create Model Directory Structure

```bash
mkdir -p src/pages/[page-name]/model
```

### 2. Create Types File (`model/types.ts`)

```typescript
// Define all data types used in the page
export type PageEntity = {
  id: string;
  name: string;
  // ... other fields
};
```

### 3. Create Hooks File (`model/use[Entity].ts`)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUser, getCurrentUserOrganization, createAuditLog } from '@/shared/lib/query-utils';
import type { PageEntity } from './types';

// Query Hooks
export function usePageEntities() {
  return useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const { profile } = await getCurrentUserOrganization();
      // Fetch logic
      return data;
    },
  });
}

// Mutation Hooks
export function useCreateEntity() {
  return useMutation({
    mutationFn: async (input: ICreateInput) => {
      const user = await getCurrentUser();
      // Create logic
    },
  });
}
```

### 4. Refactor Component (`index.tsx`)

**Before:**
```typescript
// All logic inline
export function PageName() {
  const { data, isLoading } = useQuery({
    queryKey: ['entities'],
    queryFn: async () => { /* ... */ },
  });
  // ...
}
```

**After:**
```typescript
import { usePageEntities, useCreateEntity } from './model/use[Entity]';

export function PageName() {
  const { data, isLoading } = usePageEntities();
  const createEntity = useCreateEntity();
  
  // Component logic only
  return (
    <div>
      {/* UI */}
    </div>
  );
}
```

### 5. Key Patterns to Follow

#### Query Keys
```typescript
// Hierarchical pattern
queryKey: ['documents']           // Top level
queryKey: ['documents', search]   // With filters
queryKey: ['document', id]        // Specific resource
queryKey: ['document-versions', id] // Sub-resources
```

#### Mutation Success Handlers
```typescript
onSuccess: (data, variables) => {
  // Invalidate related queries
  queryClient.invalidateQueries({ queryKey: ['entities'] });
  
  // Show feedback
  toast.success(t('common.success'), t('action.completed'));
  
  // Navigate if needed
  navigate('/path');
}
```

#### Error Handling
```typescript
import { showErrorToast } from '@/shared/lib/error-utils';

// In component
.catch((error) => {
  showErrorToast(error, 'Failed to perform action');
});
```

### 6. Common Hook Patterns

#### Paginated List Hook
```typescript
export function useEntities(page: number, limit: number = 10) {
  return useQuery({
    queryKey: ['entities', page, limit],
    queryFn: async () => {
      const from = page * limit;
      const to = from + limit;
      // Fetch with pagination
    },
  });
}
```

#### Search Hook
```typescript
export function useSearchEntities(query: string) {
  return useQuery({
    queryKey: ['entities', 'search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      // Search logic
    },
    enabled: query.length >= 2,
  });
}
```

#### Filtered List Hook
```typescript
export function useEntities(filter: FilterType) {
  return useQuery({
    queryKey: ['entities', filter],
    queryFn: async () => {
      let q = supabase.from('entities').select('*');
      
      if (filter.status) q = q.eq('status', filter.status);
      if (filter.organizationId) q = q.eq('organization_id', filter.organizationId);
      
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
```

### 7. Audit Logging

Always add audit logs to mutations:

```typescript
// Create mutation
mutationFn: async (input) => {
  // ... operation
  
  await createAuditLog(
    'entity_created',        // action
    'module_name',           // action_category
    'entity_type',           // entity_type
    { id: result.id, ...input } // data
  );
}
```

### 8. State Management

Use React Query for all async state:
- `useQuery` for fetches
- `useMutation` for creates/updates/deletes
- `useQueryClient` for invalidation

Never use useState for async data:
```typescript
// ❌ Don't do this
const [data, setData] = useState([]);

// ✓ Do this instead
const { data } = useQuery({ ... });
```

### 9. Testing Checklist

- [ ] Component renders without errors
- [ ] Loading state displays correctly
- [ ] Empty state displays when no data
- [ ] Data displays correctly
- [ ] Actions (create/update/delete) work
- [ ] Error handling works
- [ ] i18n strings are used
- [ ] Pagination/filtering works (if applicable)
- [ ] Build passes without errors

### 10. Performance Tips

1. **Memoize expensive calculations**
   ```typescript
   const items = useMemo(() => 
     data?.filter(/* expensive filter */)
   , [data]);
   ```

2. **Use query staleTime**
   ```typescript
   staleTime: 1000 * 60 * 5, // 5 minutes
   gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
   ```

3. **Debounce search inputs**
   ```typescript
   const [search, setSearch] = useState('');
   const debouncedSearch = useMemo(
     () => debounce(setSearch, 300),
     []
   );
   ```

4. **Lazy load dialogs/modals**
   ```typescript
   const [open, setOpen] = useState(false);
   // Only fetch data when modal opens
   ```
