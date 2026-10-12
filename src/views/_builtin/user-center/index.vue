<script setup lang="ts">
import { reactive } from 'vue';
import { NButton } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchUpdateUserPassword, fetchUpdateUserProfile } from '@/service/api/system';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import UserAvatar from './modules/user-avatar.vue';
import UserContactForm from './modules/user-contact-form.vue';

defineOptions({
  name: 'UserCenter'
});

const authStore = useAuthStore();
const { userInfo } = authStore;

const { loading: btnLoading, startLoading: startBtnLoading, endLoading: endBtnLoading } = useLoading();

const {
  formRef: profileFormRef,
  validate: profileValidate,
  restoreValidation: profileRestoreValidation
} = useNaiveForm();
const {
  formRef: passwordFormRef,
  validate: passwordValidate,
  restoreValidation: passwordRestoreValidation
} = useNaiveForm();
const { createRequiredRule, patternRules } = useFormRules();

type ProfileModel = Api.System.UserProfileOperateParams;
type PasswordModel = Api.System.UserPasswordOperateParams & { confirmPassword: string };

const profileModel: ProfileModel = reactive(createDefaultProfileModel());
const passwordModel: PasswordModel = reactive(createDefaultPasswordModel());

function createDefaultProfileModel(): ProfileModel {
  return {
    nickname: userInfo.nickname || '',
    gender: userInfo.gender ?? 0
  };
}

function createDefaultPasswordModel(): PasswordModel {
  return {
    oldPassword: '',
    confirmPassword: '',
    newPassword: ''
  };
}

type ProfileRuleKey = keyof ProfileModel;
type PasswordRuleKey = Extract<keyof PasswordModel, 'oldPassword' | 'newPassword' | 'confirmPassword'>;

const profileRules: Record<ProfileRuleKey, App.Global.FormRule> = {
  nickname: {
    required: true,
    pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,30}$/,
    message: '昵称为 2–30 位中文、字母、数字、下划线或短横线',
    trigger: 'blur'
  },
  gender: { ...createRequiredRule('性别不能为空'), type: 'number' }
};

const passwordRules: Record<PasswordRuleKey, App.Global.FormRule> = {
  oldPassword: createRequiredRule('旧密码不能为空'),
  confirmPassword: createRequiredRule('确认密码不能为空'),
  newPassword: { ...patternRules.pwd, required: true }
};

async function updateProfile() {
  if (btnLoading.value) return;
  await profileValidate();
  startBtnLoading();
  try {
    const { error } = await fetchUpdateUserProfile({ ...profileModel });
    if (!error) {
      window.$message?.success('更新成功');
      // 更新本地用户信息
      Object.assign(userInfo, {
        nickname: profileModel.nickname,
        gender: profileModel.gender
      });
      profileRestoreValidation();
    }
  } finally {
    endBtnLoading();
  }
}

async function updatePassword() {
  if (btnLoading.value) return;
  await passwordValidate();
  if (passwordModel.newPassword !== passwordModel.confirmPassword) {
    window.$message?.error('两次输入的密码不一致');
    return;
  }
  startBtnLoading();
  try {
    const { oldPassword, newPassword } = passwordModel;
    const { error } = await fetchUpdateUserPassword({ oldPassword, newPassword });
    if (!error) {
      window.$message?.success('密码修改成功');
      // 清空表单
      Object.assign(passwordModel, createDefaultPasswordModel());
      passwordRestoreValidation();
    }
  } catch (error) {
    window.$message?.error((error as Error).message);
  } finally {
    endBtnLoading();
  }
}
</script>

<template>
  <div class="flex gap-16px lt-lg:flex-col">
    <!-- 个人信息卡片 -->
    <NCard title="个人信息" class="w-360px shrink-0 shadow-sm lt-lg:w-full">
      <div class="flex-x-center flex-wrap gap-24px">
        <div class="flex-center flex-col gap-16px">
          <div class="relative">
            <UserAvatar />
          </div>
          <div class="text-18px font-medium">{{ userInfo.nickname }}</div>
          <div class="text-14px text-gray-500">{{ userInfo.username }}</div>
        </div>
        <NDescriptions :column="1" label-placement="left" label-width="120px">
          <NDescriptionsItem label="手机号码">
            <div class="text-14px">{{ userInfo.phone }}</div>
          </NDescriptionsItem>
          <NDescriptionsItem label="用户邮箱">
            <div class="text-14px">{{ userInfo.email }}</div>
          </NDescriptionsItem>
          <NDescriptionsItem label="所属部门">
            <div class="text-14px">{{ userInfo.deptName }}</div>
          </NDescriptionsItem>
          <NDescriptionsItem label="所属角色">
            <NSpace>
              <NTag v-for="role in userInfo.roleNames" :key="role" type="primary" size="small">
                {{ role }}
              </NTag>
            </NSpace>
          </NDescriptionsItem>
          <NDescriptionsItem label="创建日期">
            <div class="text-14px">{{ userInfo.registrationDate }}</div>
          </NDescriptionsItem>
        </NDescriptions>
      </div>
    </NCard>

    <!-- 基本资料卡片 -->
    <NCard title="基本资料" class="w-full overflow-x-auto shadow-sm">
      <NTabs type="line" animated class="h-full">
        <NTabPane name="userInfo" tab="基本资料">
          <NForm
            ref="profileFormRef"
            :model="profileModel"
            :rules="profileRules"
            label-placement="left"
            label-width="100px"
            class="mt-16px max-w-520px"
          >
            <NFormItem label="昵称" path="nickname">
              <NInput v-model:value="profileModel.nickname" :disabled="btnLoading" placeholder="请输入昵称" />
            </NFormItem>
            <NFormItem label="性别" path="gender">
              <DictSelect v-model:value="profileModel.gender" dict-code="gender_enum" :disabled="btnLoading" />
            </NFormItem>
            <NFormItem class="flex items-center justify-end">
              <NButton class="ml-20px w-80px" type="primary" :loading="btnLoading" @click="updateProfile">
                <template #icon>
                  <SvgIcon icon="ic:outline-save" class="size-24px" />
                </template>
                保存
              </NButton>
            </NFormItem>
          </NForm>
        </NTabPane>
        <NTabPane name="contacts" tab="联系方式">
          <UserContactForm kind="email" />
          <NDivider />
          <UserContactForm kind="phone" />
        </NTabPane>
        <NTabPane name="updatePwd" tab="修改密码">
          <NForm
            ref="passwordFormRef"
            :model="passwordModel"
            :rules="passwordRules"
            label-placement="left"
            label-width="100px"
            class="mt-16px max-w-520px"
          >
            <NFormItem label="旧密码" path="oldPassword">
              <NInput
                v-model:value="passwordModel.oldPassword"
                type="password"
                placeholder="请输入旧密码"
                show-password-on="click"
              />
            </NFormItem>
            <NFormItem label="新密码" path="newPassword">
              <NInput
                v-model:value="passwordModel.newPassword"
                type="password"
                placeholder="请输入新密码"
                show-password-on="click"
              />
            </NFormItem>
            <NFormItem label="确认密码" path="confirmPassword">
              <NInput
                v-model:value="passwordModel.confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                show-password-on="click"
              />
            </NFormItem>
            <NFormItem class="flex items-center justify-end">
              <NButton class="ml-20px w-120px" type="primary" :loading="btnLoading" @click="updatePassword">
                <template #icon>
                  <SvgIcon icon="ic:outline-key" class="size-24px" />
                </template>
                修改密码
              </NButton>
            </NFormItem>
          </NForm>
        </NTabPane>
      </NTabs>
    </NCard>
  </div>
</template>

<style scoped>
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

:deep(.n-tabs-pane-wrapper),
:deep(.n-tab-pane) {
  height: 100% !important;
}
</style>
