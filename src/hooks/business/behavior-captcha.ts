import { h } from 'vue';
import BehaviorCaptcha from '@/components/custom/behavior-captcha.vue';

export function verifyBehaviorCaptcha() {
  return new Promise<string | null>(resolve => {
    if (!window.$dialog) {
      resolve(null);
      return;
    }
    const dialog = window.$dialog.create({
      title: '安全验证',
      showIcon: false,
      maskClosable: false,
      content: () =>
        h(BehaviorCaptcha, {
          onVerified(verification) {
            resolve(verification);
            dialog.destroy();
          }
        }),
      onClose: () => resolve(null),
      onAfterLeave: () => resolve(null)
    });
  });
}
