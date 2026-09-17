import { JSEncrypt } from 'jsencrypt';

const publicKey = import.meta.env.VITE_APP_RSA_PUBLIC_KEY;

export const encrypt = (txt: string) => {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(publicKey!);
  return encryptor.encrypt(txt);
};
