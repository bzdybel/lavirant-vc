export interface CaptchaPort {
  verify(token?: string, ip?: string): Promise<boolean>;
}
