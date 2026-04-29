/** Allowed login username (case-insensitive). Maps to a fixed Supabase Auth email. */
export const FUEL_ADMIN_USERNAME = "fuel_admin";

/** Create this exact user in Supabase Dashboard → Authentication → Users. */
export function fuelAdminAuthEmail() {
	return "ben@fuelsydney.com.au";
}

/**
 * @param {string} username
 * @returns {string | null} Email for signInWithPassword, or null if not allowed
 */
export function usernameToAuthEmail(username) {
	const u = String(username ?? "")
		.trim()
		.toLowerCase();
	if (u === FUEL_ADMIN_USERNAME) return fuelAdminAuthEmail();
	return null;
}
