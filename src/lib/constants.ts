import { Canton, Center, RmaCode } from "@prisma/client";

export const CENTER_CANTON_MAP: Record<Center, Canton> = {
  FRIBOURG: "FR",
  LAUSANNE: "VD",
  GENEVA: "GE",
};

export const RMA_CODE_COLORS: Record<RmaCode, string> = {
  X: "bg-green-100 text-green-800 border-green-300",
  O: "bg-blue-100 text-blue-800 border-blue-300",
  A: "bg-orange-100 text-orange-800 border-orange-300",
  B: "bg-red-100 text-red-800 border-red-300",
  C: "bg-red-100 text-red-800 border-red-300",
  D: "bg-red-100 text-red-800 border-red-300",
  E: "bg-slate-100 text-slate-800 border-slate-300",
  F: "bg-pink-100 text-pink-800 border-pink-300",
  G: "bg-yellow-100 text-yellow-800 border-yellow-300",
  H: "bg-gray-200 text-gray-600 border-gray-400",
  I: "bg-indigo-100 text-indigo-800 border-indigo-300",
  M: "bg-purple-100 text-purple-800 border-purple-300",
};

export const RMA_CODE_BG: Record<RmaCode, string> = {
  X: "bg-green-500",
  O: "bg-blue-500",
  A: "bg-orange-500",
  B: "bg-red-500",
  C: "bg-red-400",
  D: "bg-red-600",
  E: "bg-slate-500",
  F: "bg-pink-500",
  G: "bg-yellow-500",
  H: "bg-gray-400",
  I: "bg-indigo-500",
  M: "bg-purple-500",
};
