export interface CaptchaPort {
  verify(token: string | undefined, ip?: string): Promise<boolean>;
}
