declare module 'cleaker' {
    export default class Cleaker {
      static hash(
        data: object | string,
        algorithm?: string,
        iterations?: number
      ): string;
      static me(options: any): any;
      static salt(length?: number): string;
      static generatePassword(length?: number): string;
      static validateUsername(username: string): boolean;
      static validateEmail(email: string): boolean;
      static verifyPassword(
        password: string,
        hashedPassword: string,
        salt: string,
        iterations?: number
      ): boolean;
      static randomToken(length?: number): string;
      static passwordSecurityCheck(password: string): boolean;
      static hashPassword(
        password: string,
        salt: string,
        iterations?: number
      ): string;
    }
  }
  