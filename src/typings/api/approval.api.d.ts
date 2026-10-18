declare namespace Api {
  namespace Approval {
    type FlowNode = {
      id: string;
      name: string;
      type: 'APPROVAL';
      approverType: 'USER';
      approvers: CommonType.IdType[];
      approveMode: 'AND' | 'OR';
    };

    type Definition = {
      id: CommonType.IdType;
      code: string;
      name: string;
      category?: string | null;
      description?: string | null;
      status: 0 | 1;
      createTime?: string;
    };

    type FormFieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'AMOUNT' | 'DATE' | 'DATERANGE' | 'SELECT' | 'RADIO';
    type FormOption = { label: string; value: string };
    type FormField = {
      id: string;
      key: string;
      label: string;
      type: FormFieldType;
      required: boolean;
      placeholder?: string;
      defaultValue?: unknown;
      validation?: { minLength?: number; maxLength?: number; min?: number; max?: number };
      options?: FormOption[];
    };
    type FormConfig = { version: 1; fields: FormField[] };
    type DefinitionDetail = Definition & { flowConfig: string; formConfig?: string | null };
    type DefinitionReq = Omit<Definition, 'id' | 'createTime'> & { flowConfig: string; formConfig: string };
    type DefinitionQuery = { name?: string | null; category?: string | null; status?: 0 | 1 | null };
    type StartReq = {
      definitionCode: string;
      businessKey: string;
      businessType: string;
      title: string;
      formData?: string;
    };
    type Status = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'TRANSFERRED';
    type Instance = {
      id: CommonType.IdType;
      definitionCode: string;
      businessKey: string;
      businessType: string;
      title: string;
      currentNodeId?: string | null;
      currentNodeName?: string | null;
      status: Status;
      startUser: CommonType.IdType;
      startUserName?: string;
      startTime: string;
      endTime?: string | null;
      formData?: string | null;
      formConfig?: string | null;
    };
    type Task = {
      id: CommonType.IdType;
      instanceId: CommonType.IdType;
      title?: string;
      nodeId?: string;
      nodeName: string;
      assignee: CommonType.IdType;
      status: Status;
      createTime: string;
      completeTime?: string | null;
      opinion?: string | null;
    };
    type History = {
      id: CommonType.IdType;
      nodeName?: string | null;
      operator: CommonType.IdType;
      action: 'START' | 'APPROVE' | 'REJECT' | 'TRANSFER' | 'CANCEL';
      opinion?: string | null;
      fromUser?: CommonType.IdType | null;
      toUser?: CommonType.IdType | null;
      createTime: string;
    };
    type Detail = { instance: Instance; tasks: Task[]; history: History[]; userNames: Record<string, string> };
    type InstanceQuery = {
      page: number;
      size: number;
      title?: string | null;
      businessType?: string | null;
      status?: Status | null;
    };
    type TaskQuery = { page: number; size: number; title?: string | null; completed: boolean };
    type Page<T> = { list: T[]; total: number };
    type OpinionReq = { opinion?: string; attachments?: string };
    type TransferReq = { toUserId: CommonType.IdType; reason?: string };
  }
}
