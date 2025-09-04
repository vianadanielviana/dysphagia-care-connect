import { z } from 'zod';

// Validation schemas for security
export const emailSchema = z.string().email('Email inválido').min(1, 'Email é obrigatório');

export const passwordSchema = z.string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número');

export const nomeSchema = z.string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços');

export const cpfSchema = z.string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato xxx.xxx.xxx-xx');

export const telefoneSchema = z.string()
  .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (xx) xxxxx-xxxx');

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  nome: nomeSchema,
  tipo_usuario: z.enum(['cuidador', 'fonoaudiologo'])
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória')
});

export const pacienteSchema = z.object({
  nome: nomeSchema,
  cpf: z.string().optional().refine(val => !val || val.length === 0 || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val), {
    message: 'CPF deve estar no formato xxx.xxx.xxx-xx'
  }),
  email: z.string().optional().refine(val => !val || val.length === 0 || z.string().email().safeParse(val).success, {
    message: 'Email inválido'
  }),
  telefone: z.string().optional().refine(val => {
    if (!val || val.length === 0) return true;
    // Accept both formats: (xx) xxxxx-xxxx or xxxxxxxxxxx
    return /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(val) || /^\d{10,11}$/.test(val);
  }, {
    message: 'Telefone deve estar no formato (xx) xxxxx-xxxx'
  }),
  data_nascimento: z.string().optional(),
  endereco: z.string().max(200, 'Endereço deve ter no máximo 200 caracteres').optional(),
  tipo_usuario: z.enum(['paciente']),
  diagnostico: z.string().max(500, 'Diagnóstico deve ter no máximo 500 caracteres').optional(),
  historico_medico: z.string().max(1000, 'Histórico médico deve ter no máximo 1000 caracteres').optional(),
  medicamentos_atuais: z.string().max(500, 'Medicamentos atuais deve ter no máximo 500 caracteres').optional(),
  observacoes: z.string().max(500, 'Observações deve ter no máximo 500 caracteres').optional(),
  responsavel_nome: z.string().optional().refine(val => {
    if (!val || val.length === 0) return true;
    return val.length >= 2 && /^[a-zA-ZÀ-ÿ\s]+$/.test(val);
  }, {
    message: 'Nome deve conter apenas letras e espaços e ter pelo menos 2 caracteres'
  }),
  responsavel_email: z.string().optional().refine(val => !val || val.length === 0 || z.string().email().safeParse(val).success, {
    message: 'Email inválido'
  }),
  responsavel_telefone: z.string().optional().refine(val => {
    if (!val || val.length === 0) return true;
    // Accept both formats: (xx) xxxxx-xxxx or xxxxxxxxxxx
    return /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(val) || /^\d{10,11}$/.test(val);
  }, {
    message: 'Telefone deve estar no formato (xx) xxxxx-xxxx'
  })
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type PacienteFormData = z.infer<typeof pacienteSchema>;