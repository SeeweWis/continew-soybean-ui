type MenuId = string | number;
type MenuNode = { id: MenuId; children?: MenuNode[] };

function getRelatedIds(tree: MenuNode[], id: MenuId) {
  let ancestors: MenuId[] = [];
  const descendants: MenuId[] = [];

  function collect(nodes: MenuNode[]): void {
    nodes.forEach(node => {
      descendants.push(node.id);
      collect(node.children ?? []);
    });
  }

  function find(nodes: MenuNode[], parents: MenuId[]): boolean {
    for (const node of nodes) {
      if (String(node.id) === String(id)) {
        ancestors = parents;
        collect(node.children ?? []);
        return true;
      }
      if (find(node.children ?? [], [...parents, node.id])) return true;
    }
    return false;
  }

  find(tree, []);
  return { ancestors, descendants };
}

export function includeAncestors(tree: MenuNode[], ids: MenuId[]) {
  const selected = new Map(ids.map(id => [String(id), id]));
  ids.forEach(id => {
    getRelatedIds(tree, id).ancestors.forEach(parentId => selected.set(String(parentId), parentId));
  });
  return [...selected.values()];
}

export function updateCheckedIds(tree: MenuNode[], previousIds: MenuId[], ids: MenuId[], cascadeChildren = true) {
  const previous = new Set(previousIds.map(String));
  const selected = new Map(ids.map(id => [String(id), id]));
  const addedIds = ids.filter(id => !previous.has(String(id)));

  if (addedIds.length) {
    addedIds.forEach(id => {
      const { ancestors, descendants } = getRelatedIds(tree, id);
      [...ancestors, ...(cascadeChildren ? descendants : [])].forEach(relatedId =>
        selected.set(String(relatedId), relatedId)
      );
    });
  } else {
    previousIds
      .filter(id => !selected.has(String(id)))
      .forEach(id => {
        getRelatedIds(tree, id).descendants.forEach(childId => selected.delete(String(childId)));
      });
  }
  return [...selected.values()];
}
