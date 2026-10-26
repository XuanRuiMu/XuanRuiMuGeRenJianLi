import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function 合并类名(...输入表: ClassValue[]): string {
  return twMerge(clsx(输入表))
}
