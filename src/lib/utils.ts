import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export function truncateFilename(filename: string, maxLength = 35): string {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot === -1 || lastDot === 0) {
		return filename.length > maxLength
			? filename.slice(0, maxLength - 5) + "[...]"
			: filename;
	}
	const name = filename.slice(0, lastDot);
	const ext = filename.slice(lastDot);
	const allowedNameLength = maxLength - ext.length - 5; // 5 for '[...]'
	if (filename.length <= maxLength) return filename;
	return name.slice(0, allowedNameLength) + "[...]" + ext;
}