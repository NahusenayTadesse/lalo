export const bgGradient = `bg-linear-to-r from-background  to-secondary`;
export const selectItem = `hover:bg-gray-100 hover:shadow-md hover:scale-101 duration-300 transition-all ease-in-out dark:hover:bg-gray-900`;
export const toastmsg = `fixed right-4 bottom-20 lg:bottom-4 z-50
             flex items-center gap-3
             bg-green-600 text-white font-medium
             px-5 py-3 rounded-xl shadow-lg
             animate-slide-in`;
export const errormsg = `${toastmsg} !bg-red-600`;
export const searchableFields = [
	'name',
	'description',
	'permissions',
	'value',
	'firstName',
	'lastName',
	'phone',
	'date',
	'time',
	'bookedBy',
	'notes',
	'bookedAt',
	'customerName',
	'date',
	'time'
];

export const dropdownClass = `flex capitalize flex-row gap-2 ${selectItem}`;

export const gender = [
	{ value: 'male', name: 'Male' },
	{ value: 'female', name: 'Female' }
];

export function minutesToHoursString(minutes: number) {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${h}h ${m}m`;
}

import { sql } from 'drizzle-orm';
import type { MySqlColumn } from 'drizzle-orm/mysql-core';
import { SvelteDate } from 'svelte/reactivity';

export function extractUsername(email: string) {
	if (typeof email !== 'string') {
		throw new Error('Input must be a string');
	}

	// Find the part before the '@'
	const atIndex = email.indexOf('@');

	if (atIndex === -1) {
		throw new Error("Invalid email address: missing '@'");
	}

	return email.substring(0, atIndex);
}

export function getCurrentMonthRange(): string {
	const today = new SvelteDate();

	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');

	const firstOfMonth = `${year}-${month}-01`;
	const todayStr = `${year}-${month}-${day}`;

	return `${firstOfMonth}-${todayStr}`;
}

export const currentMonthFilter = (dateField: MySqlColumn, start?: string, end?: string) => {
	// If start/end are passed, return BETWEEN condition
	if (start && end) {
		const endOfDay = new SvelteDate(end);
		endOfDay.setHours(23, 59, 59, 999);

		return sql`${dateField} BETWEEN ${start} AND ${endOfDay}`;
	}

	// Otherwise fallback to current-month logic
	const currentYear = new SvelteDate().getFullYear();
	const currentMonth = new SvelteDate().getMonth() + 1;

	return sql`
    EXTRACT(YEAR FROM ${dateField}) = ${currentYear}
    AND EXTRACT(MONTH FROM ${dateField}) = ${currentMonth}
  `;
};

export function isMobile() {
	if (typeof window === 'undefined') return false; // SSR guard
	return window.innerWidth <= 768;
}

import crypto from 'crypto';

export function generatePassword(
	length: number = 8,
	options = {
		lowercase: true,
		uppercase: true,
		numbers: true,
		symbols: true
	}
): string {
	const lowers = 'abcdefghijklmnopqrstuvwxyz';
	const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const nums = '0123456789';
	const syms = '!@#$%^&*()-_=+[]{};:,.<>/?';

	let chars = '';
	if (options.lowercase) chars += lowers;
	if (options.uppercase) chars += uppers;
	if (options.numbers) chars += nums;
	if (options.symbols) chars += syms;

	if (!chars) throw new Error('No character sets selected!');

	let password = '';
	const charArray = chars.split('');

	for (let i = 0; i < length; i++) {
		const randomIndex = crypto.randomInt(0, charArray.length);
		password += charArray[randomIndex];
	}

	return password;
}

export function formatETB(amount: number, useAmharic: boolean = false): string {
	// 'am-ET' for Amharic/Ethiopic script (ብር)
	// 'en-ET' for English/Latin script (Br)
	const locale = useAmharic ? 'am-ET' : 'en-ET';

	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: 'ETB',
		// Optional: Controls whether to show "ETB", "Br", or "ብር"
		currencyDisplay: 'symbol',
		minimumFractionDigits: 2
	}).format(amount);
}

export type Item = {
	value: string | number;
	name: string;
};

export const formatEthiopianDate = (date: Date | undefined): string => {
	if (!date) return '';

	const formatter = new Intl.DateTimeFormat('am-ET', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		calendar: 'ethiopic'
	});

	return formatter.format(date);
};
