import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export const activationSchema = z
  .object({
    clientAccessId: z.string().uuid(),
    code: z.string().trim().min(6, "Código inválido.").max(12, "Código inválido."),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
    passwordConfirmation: z.string().min(8),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export const createInviteSchema = z.object({
  clientId: z.string().uuid(),
  email: z.string().trim().email("Informe um e-mail válido."),
  fullName: z.string().trim().min(1, "Informe o nome completo."),
});

export const blockUserSchema = z.object({
  profileId: z.string().uuid(),
  reason: z.string().trim().min(1, "Informe o motivo do bloqueio."),
});

export const resendActivationCodeSchema = z.object({
  clientAccessId: z.string().uuid(),
});

export const revokeSessionsSchema = z.object({
  profileId: z.string().uuid(),
});
