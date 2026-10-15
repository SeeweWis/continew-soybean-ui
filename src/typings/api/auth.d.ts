declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    type AuthType = 'ACCOUNT' | 'EMAIL' | 'PHONE' | 'MINI_PROGRAM' | 'SOCIAL';

    interface LoginFormBase {
      clientId: string;
      authType: AuthType;
    }

    interface PwdLoginForm extends LoginFormBase {
      authType: 'ACCOUNT';
      username: string;
      password: string;
      captcha?: string;
      uuid?: string;
    }

    interface PhoneLoginForm extends LoginFormBase {
      authType: 'PHONE';
      phone: string;
      captcha: string;
    }

    interface MiniProgramLoginForm extends LoginFormBase {
      authType: 'MINI_PROGRAM';
      code: string;
    }

    interface EmailLoginForm extends LoginFormBase {
      authType: 'EMAIL';
      email: string;
      captcha: string;
    }

    interface SocialLoginForm extends LoginFormBase {
      authType: 'SOCIAL';
      source: string;
      code: string;
      state: string;
    }

    type LoginForm = PwdLoginForm | PhoneLoginForm | MiniProgramLoginForm | EmailLoginForm | SocialLoginForm;

    interface LoginToken {
      accessToken: string;
      tokenType: string;
      expiresIn: number;
      refreshExpiresIn?: number;
      tenantId?: CommonType.IdType;
    }

    interface UserInfo {
      id?: CommonType.IdType;
      username?: string;
      nickname?: string;
      gender?: 0 | 1 | 2;
      email?: string;
      phone?: string;
      avatar?: string;
      description?: string;
      pwdResetTime?: string;
      pwdExpired?: boolean;
      registrationDate?: string;
      deptId?: CommonType.IdType;
      deptName?: string;
      roles: string[];
      permissions: string[];
      roleNames: string[];
    }

    interface Route {
      id: CommonType.IdType;
      parentId: CommonType.IdType;
      title: string;
      type: 1 | 2 | 3;
      path: string;
      name?: string;
      component?: string;
      redirect?: string;
      icon?: string;
      isExternal?: boolean;
      isCache?: boolean;
      isHidden?: boolean;
      permission?: string;
      sort?: number;
      children?: Route[];
    }

    /** tenant */
    interface Tenant {
      /** 企业名称 */
      companyName: string;
      /** 域名 */
      domain: string;
      /** 租户编号 */
      tenantId: string;
    }

    /** login tenant */
    interface LoginTenant {
      /** 租户开关 */
      tenantEnabled: boolean;
      /** 租户列表 */
      voList: Tenant[];
    }

    interface CaptchaCode {
      img?: string;
      uuid?: string;
    }
  }
}
