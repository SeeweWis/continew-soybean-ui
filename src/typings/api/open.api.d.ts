/**
 * Namespace Api
 *
 * backend api module: "open"
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
}
