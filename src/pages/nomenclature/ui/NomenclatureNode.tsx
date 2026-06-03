import { ChevronDown, ChevronRight, FolderTree, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import type { NomenclatureTreeNode } from '../model/types';

type Props = {
  node: NomenclatureTreeNode;
  level: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAdd: (id: string) => void;
  onDelete: (id: string) => void;
  onDrop: (dragId: string, targetId: string) => void;
};

export function NomenclatureNode({
  node,
  level,
  expanded,
  onToggle,
  onAdd,
  onDelete,
  onDrop,
}: Props) {
  const isOpen = expanded.has(node.id);

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData('id', node.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e.dataTransfer.getData('id'), node.id)}
        className="flex items-center gap-3 py-3 border-b hover:bg-gray-50"
        style={{ paddingLeft: level * 20 + 16 }}
      >
        <button onClick={() => onToggle(node.id)}>
          {node.children.length ? (
            isOpen ? <ChevronDown /> : <ChevronRight />
          ) : (
            <span className="w-4" />
          )}
        </button>

        <FolderTree className="h-4 w-4 text-amber-600" />

        <div className="flex-1">
          <div className="text-sm font-medium">{node.code}</div>
          <div className="text-sm text-gray-600">{node.title}</div>
        </div>

        {node.retention_years && (
          <Badge>{node.retention_years}y</Badge>
        )}

        <Button size="sm" variant="ghost" onClick={() => onAdd(node.id)}>
          <Plus className="h-4 w-4" />
        </Button>

        <Button size="sm" variant="ghost" onClick={() => onDelete(node.id)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      {isOpen &&
        node.children.map((child) => (
          <NomenclatureNode
            key={child.id}
            node={child}
            level={level + 1}
            expanded={expanded}
            onToggle={onToggle}
            onAdd={onAdd}
            onDelete={onDelete}
            onDrop={onDrop}
          />
        ))}
    </div>
  );
}