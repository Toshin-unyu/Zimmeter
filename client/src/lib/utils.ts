import type { Category } from './constants';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCategoryStyle(category: Category | undefined) {
  if (!category?.color) return { className: '', style: {} };
  
  if (category.color.startsWith('#')) {
    return {
      style: { 
        backgroundColor: category.color, 
        borderColor: category.borderColor || category.color 
      },
      className: ''
    };
  }
  
  return {
    style: {},
    className: category.color
  };
}

export function getCategoryDotStyle(category: Category | undefined) {
   if (!category?.color) return { className: 'bg-gray-300', style: {} };
   
   if (category.color.startsWith('#')) {
     return {
       style: { backgroundColor: category.color },
       className: ''
     };
   }
   
   // Assumes the first class is the background color
   return {
     style: {},
     className: category.color.split(' ')[0]
   };
}
