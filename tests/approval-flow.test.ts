import assert from 'node:assert/strict';
import { parseFlowConfig, serializeFlowConfig } from '../src/views/approval/modules/flow-config';
import {
  defaultFormConfig,
  parseFormConfig,
  serializeFormConfig,
  validateFormConfig
} from '../src/views/approval/modules/form-config';

const userId = '9223372036854775000';
const nodes = [
  {
    id: 'review',
    name: '部门审批',
    type: 'APPROVAL' as const,
    approverType: 'USER' as const,
    approvers: [userId],
    approveMode: 'AND' as const
  }
];
assert.deepEqual(parseFlowConfig(serializeFlowConfig(nodes)), nodes);
assert.throws(() => parseFlowConfig('{broken'), /配置/);
assert.throws(() => serializeFlowConfig([]), /至少/);
assert.throws(() => serializeFlowConfig([{ ...nodes[0], approvers: [] }]), /审批人/);
assert.throws(() => serializeFlowConfig([nodes[0], nodes[0]]), /重复/);
assert.throws(() => parseFlowConfig(JSON.stringify({ nodes: [{ ...nodes[0], approverType: 'ROLE' }] })), /指定用户/);
assert.throws(() => parseFlowConfig(JSON.stringify({ nodes: [{ ...nodes[0], approveMode: 'INVALID' }] })), /审批模式/);
assert.throws(
  () => parseFlowConfig(JSON.stringify({ nodes: [{ ...nodes[0], approvers: [Number(userId)] }] })),
  /审批人/
);
const formConfig = defaultFormConfig();
assert.deepEqual(parseFormConfig(serializeFormConfig(formConfig)), formConfig);
assert.throws(() => validateFormConfig({ ...formConfig, fields: [] }), /至少/);
assert.throws(
  () => validateFormConfig({ ...formConfig, fields: [{ ...formConfig.fields[0], key: '1invalid' }] }),
  /编码格式/
);
console.log('PASS: approval flow validation, round-trip and large user IDs');
