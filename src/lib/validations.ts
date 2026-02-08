import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nom requis (min. 2 caractères)"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe requis (min. 6 caractères)"),
  center: z.enum(["FRIBOURG", "LAUSANNE", "GENEVA"]),
});

export const rmaSubmissionSchema = z.object({
  year: z.number().int().min(2024).max(2030),
  month: z.number().int().min(1).max(12),
  center: z.enum(["FRIBOURG", "LAUSANNE", "GENEVA"]),
  mandateEmployer: z.string().optional(),
  mandateRole: z.string().optional(),
  mandateStartDate: z.string().optional(),
  mandateEndDate: z.string().optional(),
  feedbackQ5: z.string().optional(),
  feedbackQ6: z.string().optional(),
  feedbackQ7: z.string().optional(),
  feedbackQ8: z.string().optional(),
  feedbackQ9: z.string().optional(),
  entries: z.array(
    z.object({
      day: z.number().int().min(1).max(31),
      halfDay: z.enum(["AM", "PM"]),
      code: z.enum(["X", "O", "A", "B", "C", "D", "E", "F", "G", "H", "I", "M"]),
    })
  ),
  absenceDetails: z
    .array(
      z.object({
        category: z.enum([
          "JOB_SEARCH",
          "DOCTOR_VISIT",
          "ORP_APPOINTMENT",
          "JOB_INTERVIEW",
          "OTHER",
        ]),
        date: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
  formationIds: z.array(z.string()).optional(),
});

export const attendanceSchema = z.object({
  date: z.string(),
  halfDay: z.enum(["AM", "PM"]),
  center: z.enum(["FRIBOURG", "LAUSANNE", "GENEVA"]),
  actualCode: z.enum(["X", "O", "A", "B", "C", "D", "E", "F", "G", "H", "I", "M"]),
  notes: z.string().optional(),
});

export const participantSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Min. 6 caractères").optional(),
  role: z.enum(["PARTICIPANT", "CENTER_STAFF", "ADMIN"]),
  primaryCenter: z.enum(["FRIBOURG", "LAUSANNE", "GENEVA"]),
  active: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RmaSubmissionInput = z.infer<typeof rmaSubmissionSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
