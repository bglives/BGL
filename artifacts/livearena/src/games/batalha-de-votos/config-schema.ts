import { z } from 'zod';

const imageFile = z.custom<File | undefined>(
  (file) => file === undefined || (typeof File !== 'undefined' && file instanceof File && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 8 * 1024 * 1024),
  'Use JPG, PNG ou WEBP com até 8 MB.',
);
const videoFile = z.custom<File | undefined>(
  (file) => file === undefined || (typeof File !== 'undefined' && file instanceof File && ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type) && file.size <= 30 * 1024 * 1024),
  'Use MP4, WEBM ou MOV com até 30 MB.',
);

const giftSchema = z.object({
  id: z.string().trim().min(1, 'Informe o ID do presente.'),
  name: z.string().trim().min(1, 'Informe o nome do presente.'),
  imageUrl: z.string().trim().optional(),
  costCoins: z.coerce.number().int().min(1, 'Informe um custo positivo em moedas.'),
  votes: z.coerce.number().int().min(1, 'Informe pelo menos 1 voto.'),
});

const candidateSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do candidato.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Escolha uma cor válida.'),
  avatar: imageFile,
  gifts: z.array(giftSchema).length(5, 'Cada candidato deve ter exatamente cinco presentes.'),
});

export const configSchema = z.object({
  title: z.string().trim().max(80, 'Use até 80 caracteres.').optional(),
  candidateA: candidateSchema,
  candidateB: candidateSchema,
  backgroundImage: imageFile,
  backgroundVideo: videoFile,
  format: z.enum(['vertical', 'horizontal']),
  mode: z.enum(['single', 'best-of-3', 'best-of-5']),
  roundMinutes: z.enum(['5', '10', '30']),
  intermissionSeconds: z.coerce.number().int().min(20).max(30),
  tieRule: z.enum(['draw', 'overtime']),
  doubleLastMinute: z.boolean(),
  announceDoubleSeconds: z.literal(10),
  leadChangeOvertime: z.boolean(),
  overtimeSeconds: z.literal(20),
  maxOvertimes: z.literal(2),
  likesEnergy: z.boolean(),
  chatCommands: z.boolean(),
  collectiveGoals: z.array(z.object({
    side: z.enum(['candidateA', 'candidateB', 'both']),
    points: z.coerce.number().int().min(1, 'A meta deve ter pelo menos 1 ponto.'),
    message: z.string().trim().min(1, 'Escreva a mensagem que ficará visível.'),
  })).max(10),
  energyBonusThreshold: z.coerce.number().int().min(1, 'Informe o limite de energia.'),
  energyBonusPoints: z.coerce.number().int().min(1, 'Informe um bônus de pelo menos 1 ponto.'),
  energyBonusCap: z.coerce.number().int().min(1, 'Informe um limite de bônus positivo.'),
  surpriseEvents: z.boolean(),
  powerUps: z.boolean(),
  powerUpEffect: z.enum(['shield', 'freeze']),
  powerUpGiftA: z.string().trim().optional(),
  powerUpGiftB: z.string().trim().optional(),
  smallThreshold: z.coerce.number().int().min(1),
  mediumThreshold: z.coerce.number().int().min(2),
  epicThreshold: z.coerce.number().int().min(3),
  textNarrator: z.boolean(),
  voiceNarrator: z.boolean(),
  soundVolume: z.coerce.number().min(0).max(100),
  muted: z.boolean(),
}).superRefine((config, ctx) => {
  const ids = [...config.candidateA.gifts, ...config.candidateB.gifts].map((gift) => gift.id.trim().toLowerCase());
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['candidateB', 'gifts'], message: 'Cada ID de presente deve ser único entre os dois candidatos.' });
  }
  if (!(config.smallThreshold < config.mediumThreshold && config.mediumThreshold < config.epicThreshold)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mediumThreshold'], message: 'Os limites devem crescer: pequeno, médio e épico.' });
  }
  if (config.energyBonusPoints > config.energyBonusCap) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['energyBonusCap'], message: 'O limite por partida deve cobrir pelo menos um bônus completo.' });
  }
  if (config.powerUps) {
    if (!config.candidateA.gifts.some((gift) => gift.id === config.powerUpGiftA)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['powerUpGiftA'], message: 'Escolha um presente cadastrado do candidato A.' });
    }
    if (!config.candidateB.gifts.some((gift) => gift.id === config.powerUpGiftB)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['powerUpGiftB'], message: 'Escolha um presente cadastrado do candidato B.' });
    }
  }
});

export type BatalhaDeVotosConfig = z.infer<typeof configSchema>;
