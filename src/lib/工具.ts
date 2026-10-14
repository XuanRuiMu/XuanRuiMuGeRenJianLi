import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function 合并类名(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
