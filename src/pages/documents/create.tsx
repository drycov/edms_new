import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateDocument } from '../../entities/document';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Textarea } from '../../shared/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { toast } from '../../shared/ui/toaster';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  content: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateDocumentPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createDocument = useCreateDocument();

  const onSubmit = async (data: FormData) => {
    try {
      const result = await createDocument.mutateAsync(data);
      toast.success('Document created', 'Your document has been created successfully');
      navigate(`/documents/${result.id}`);
    } catch (error) {
      toast.error('Failed to create document', 'Please try again');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Document</h1>
        <p className="text-gray-500 mt-1">Create a new document from scratch</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('title')}
                placeholder="Enter document title"
                error={errors.title?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                {...register('description')}
                placeholder="Enter document description or summary"
                rows={4}
                error={errors.description?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <Textarea
                {...register('content')}
                placeholder="Enter document content"
                rows={10}
                error={errors.content?.message}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/documents')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create Document
          </Button>
        </div>
      </form>
    </div>
  );
}
