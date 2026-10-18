/** Validate the subset supported by the current approval engine without losing large user IDs. */
export function parseFlowConfig(value: string): Api.Approval.FlowNode[] {
  let config: unknown;
  try {
    config = JSON.parse(value);
  } catch {
    throw new Error('流程配置不是有效的 JSON');
  }
  if (!config || typeof config !== 'object' || !('nodes' in config) || !Array.isArray(config.nodes)) {
    throw new Error('流程配置必须包含节点列表');
  }
  const ids = new Set<string>();
  return config.nodes.map((node: unknown) => {
    if (
      !node ||
      typeof node !== 'object' ||
      !('id' in node) ||
      !('name' in node) ||
      typeof node.id !== 'string' ||
      !node.id.trim() ||
      node.id.length > 50 ||
      typeof node.name !== 'string' ||
      !node.name.trim() ||
      node.name.length > 100
    ) {
      throw new Error('节点编号和名称不能为空，长度分别不能超过 50 和 100 个字符');
    }
    if (ids.has(node.id)) throw new Error('流程节点编号不能重复');
    ids.add(node.id);
    if (!('type' in node) || node.type !== 'APPROVAL' || !('approverType' in node) || node.approverType !== 'USER') {
      throw new Error('当前仅支持指定用户的审批节点，请保留原配置并联系管理员');
    }
    if (!('approveMode' in node) || (node.approveMode !== 'AND' && node.approveMode !== 'OR')) {
      throw new Error('请选择会签或或签审批模式');
    }
    if (
      !('approvers' in node) ||
      !Array.isArray(node.approvers) ||
      !node.approvers.length ||
      node.approvers.some(
        (id: unknown) =>
          !(typeof id === 'string' && /^[1-9]\d*$/.test(id)) &&
          !(typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
      )
    ) {
      throw new Error('每个节点至少选择一名有效审批人，大整数 ID 必须使用字符串');
    }
    const approvers = node.approvers as CommonType.IdType[];
    if (new Set(approvers.map(String)).size !== approvers.length) throw new Error('同一节点的审批人不能重复');
    return {
      id: node.id,
      name: node.name,
      type: 'APPROVAL',
      approverType: 'USER',
      approvers,
      approveMode: node.approveMode
    };
  });
}

export function serializeFlowConfig(nodes: Api.Approval.FlowNode[]): string {
  if (!nodes.length) throw new Error('请至少添加一个审批节点');
  const json = JSON.stringify({ nodes });
  parseFlowConfig(json);
  return json;
}
