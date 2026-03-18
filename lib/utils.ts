import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function amountInWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only'
  
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const n = (num: number): string => {
    if (num < 20) return a[num]
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + a[num % 10] : '')
    if (num < 1000) return n(Math.floor(num / 100)) + ' Hundred' + (num % 100 !== 0 ? ' and ' + n(num % 100) : '')
    if (num < 100000) return n(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + n(num % 1000) : '')
    if (num < 10000000) return n(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + n(num % 100000) : '')
    return n(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + n(num % 10000000) : '')
  }

  const str = n(Math.floor(num)).trim()
  return str + ' Rupees Only'
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')     // Remove all non-word chars
    .replace(/--+/g, '-')         // Replace multiple - with single -
}

export function generateRandomDigits(length: number = 4): string {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)).toString()
}
