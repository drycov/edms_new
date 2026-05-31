import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Filter, X, FileText } from 'lucide-react';
import { Input } from '../../shared/ui/input';
import { Button } from '../../shared/ui/button';
import { Card, CardContent } from '../../shared/ui/card';
import { Badge } from '../../shared/ui/badge';
import { useDocuments } from '../../entities/document';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);

  const { data: results, isLoading } = useDocuments({
    search: query || undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Perform search
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-gray-500 mt-1">Full-text search across all documents</p>
      </div>

      <form onSubmit={handleSearch}>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search documents, templates, workflows..."
              className="pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button type="submit">Search</Button>
        </div>
      </form>

      {showFilters && (
        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <Input type="date" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <Input type="date" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <Input placeholder="All types" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Input placeholder="All statuses" />
            </div>
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {results?.length || 0} results
            {query && ` for "${query}"`}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : results?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="h-12 w-12 mb-4 text-gray-300" />
            <p className="font-medium">No results found</p>
            <p className="text-sm">Try a different search term or filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results?.map((doc) => (
              <Card key={doc.id} className="hover:border-blue-300 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                      {doc.description && (
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="secondary">{doc.status}</Badge>
                        <span className="text-xs text-gray-400">
                          {doc.registration_number || 'Not registered'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
