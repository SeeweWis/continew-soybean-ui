/**
 * Namespace Api
 *
 * All backend api type
 */
declare namespace Api {
  /**
   * namespace Monitor
   *
   * backend api module: "monitor"
   */
  namespace Monitor {
    /** 在线用户（后端 OnlineUserResp） */
    type ContinewOnlineUser = {
      id: CommonType.IdType;
      token: string;
      username: string;
      nickname: string;
      clientType?: string;
      clientId?: string;
      ip?: string;
      address?: string;
      browser?: string;
      os?: string;
      loginTime?: string;
      lastActiveTime?: string;
    };

    type ContinewOnlineUserPage = {
      list: ContinewOnlineUser[];
      total: number;
    };

    type ContinewOnlineUserQuery = {
      page?: number;
      size?: number;
      nickname?: string | null;
      clientId?: string | null;
      loginTime?: string[] | null;
    };

    /** 系统日志（后端 LogResp） */
    type ContinewLog = {
      id: CommonType.IdType;
      description?: string;
      module?: string;
      timeTaken?: number;
      ip?: string;
      address?: string;
      browser?: string;
      os?: string;
      /** 操作状态（1 成功、2 失败） */
      status?: 1 | 2;
      errorMsg?: string;
      createUserString?: string;
      createTime?: string;
    };

    type ContinewLogPage = {
      list: ContinewLog[];
      total: number;
    };

    /** 系统日志详情（后端 LogDetailResp） */
    type ContinewLogDetail = ContinewLog & {
      traceId?: string;
      requestUrl?: string;
      requestMethod?: string;
      requestHeaders?: string;
      requestBody?: string;
      statusCode?: number;
      responseHeaders?: string;
      responseBody?: string;
    };

    type ContinewLogQuery = {
      page: number;
      size: number;
      description?: string | null;
      module?: string | null;
      ip?: string | null;
      createUserString?: string | null;
      createTime?: [number, number] | null;
      /** 操作状态（1 成功、2 失败） */
      status?: 1 | 2 | null;
    };
  }
}
