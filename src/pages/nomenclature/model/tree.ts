import type { NomenclatureItem, NomenclatureTreeNode } from './types';

export function buildTree(items: NomenclatureItem[]): NomenclatureTreeNode[] {
  const map = new Map<string, NomenclatureTreeNode>();
  const roots: NomenclatureTreeNode[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sort = (nodes: NomenclatureTreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code));
    nodes.forEach((n) => sort(n.children));
    return nodes;
  };

  return sort(roots);
}