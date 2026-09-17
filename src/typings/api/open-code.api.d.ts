/**
 * Namespace Api
 *
 * backend api module: "open" / "code" / "schedule"
 */
declare namespace Api {
  namespace Open {
    /** 开放应用（后端 AppResp） */
    type OpenApp = {
      id: CommonType.IdType;
      name: string;
      accessKey: string;
      expireTime?: string;
      status: 1 | 2;
      description?: string;
      createTime?: string;
    };

    type OpenAppPage = {
      list: OpenApp[];
      total: number;
    };

    type OpenAppQuery = {
      page: number;
      size: number;
      description?: string | null;
    };
  }

  namespace Code {
    /** 生成表配置（后端 GenConfigDO） */
    type GenConfig = {
      tableName: string;
      comment?: string;
      moduleName?: string;
      packageName?: string;
      businessName?: string;
      author?: string;
      tablePrefix?: string;
      classNamePrefix?: string;
      isOverride?: boolean;
      createTime?: string;
      updateTime?: string;
    };

    type GenConfigPage = {
      list: GenConfig[];
      total: number;
    };
  }
}
