import z from 'zod';

const signupSchemaValidation = z.object({
  body: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters long'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters long')
      .max(32, 'Password must be at most 32 characters long'),
  }),
});

const registerUserValidationSchema = z.object({
  body: z.object({
    token: z.string().nonempty('Token is required to register user!'),
  }),
});

const loginSchemaValidation = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters long')
      .max(32, 'Password must be at most 32 characters long'),
  }),
});

const verifyLoginOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.number(),
  }),
});

const changePasswordValidation = z.object({
  body: z.object({
    oldPassword: z
      .string()
      .min(6, 'Old password must be at least 6 characters long'),
    newPassword: z
      .string()
      .min(6, 'New password must be at least 6 characters long'),
  }),
});

const forgotPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const resetPasswordValidation = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    token: z.string().nonempty('Token is required to reset password!'),
    newPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters long!'),
  }),
});

export {
  signupSchemaValidation,
  registerUserValidationSchema,
  loginSchemaValidation,
  verifyLoginOtpSchema,
  forgotPasswordValidationSchema,
  resetPasswordValidation,
  changePasswordValidation,
};
