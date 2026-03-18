export interface ValidationRuleOptions {
    allowEmpty?: boolean;
}
export declare function normalizeUsername(value: string): string;
export declare function usernameRegexPasses(value: string, options?: ValidationRuleOptions): boolean;
export declare function emailRegexPasses(value: string, options?: ValidationRuleOptions): boolean;
export declare function phoneRegexPasses(value: string, options?: ValidationRuleOptions): boolean;
export interface PublicProfileValidationResult {
    username: {
        pass: boolean;
        normalized: string;
    };
    email: {
        pass: boolean;
        normalized: string;
    };
    phone: {
        pass: boolean;
        normalized: string;
    };
    pass: boolean;
}
export declare function validatePublicProfileInputs(input: {
    username: string;
    email: string;
    phone: string;
    emailAllowEmpty?: boolean;
    phoneAllowEmpty?: boolean;
}): PublicProfileValidationResult;
//# sourceMappingURL=validation.d.ts.map