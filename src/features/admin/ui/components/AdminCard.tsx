import { Card, CardContent } from '@/shared/ui/card';

export function AdminCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="hover:border-blue-300 cursor-pointer">
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  );
}