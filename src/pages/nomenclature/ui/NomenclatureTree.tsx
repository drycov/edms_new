import { NomenclatureNode } from './NomenclatureNode';
import type { NomenclatureTreeNode } from '../model/types';

type Props = {
  tree: NomenclatureTreeNode[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAdd: (id: string) => void;
  onDelete: (id: string) => void;
  onDrop: (dragId: string, targetId: string) => void;
};

export function NomenclatureTree({
  tree,
  expanded,
  onToggle,
  onAdd,
  onDelete,
  onDrop,
}: Props) {
  return (
    <>
      {tree.map((node) => (
        <NomenclatureNode
          key={node.id}
          node={node}
          level={0}
          expanded={expanded}
          onToggle={onToggle}
          onAdd={onAdd}
          onDelete={onDelete}
          onDrop={onDrop}
        />
      ))}
    </>
  );
}