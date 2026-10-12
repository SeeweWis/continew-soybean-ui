import { JSEncrypt } from 'jsencrypt';

const publicKey = import.meta.env.VITE_APP_RSA_PUBLIC_KEY;

export const encrypt = (txt: string) => {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(publicKey!);
  return encryptor.encrypt(txt);
};

export function encryptPassword(password: string) {
  const encrypted = encrypt(password);
  if (!encrypted) throw new Error('密码加密失败');
  return encrypted;
}
