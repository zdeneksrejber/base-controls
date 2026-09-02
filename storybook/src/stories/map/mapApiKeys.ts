/**
 * Api keys the demo hands the control, read from a gitignored `storybook/.env.local`.
 *
 * Copy `.env.local.example` to `.env.local` and fill in your own. A vendor with no key is simply not offered
 * by the control, so the keyless OpenStreetMap provider always works without any setup.
 */
export const MAP_API_KEYS = {
    here: import.meta.env.VITE_MAP_HERE_API_KEY ?? '',
    mapy: import.meta.env.VITE_MAP_MAPY_API_KEY ?? '',
    google: import.meta.env.VITE_MAP_GOOGLE_API_KEY ?? ''
};

/** Whether any key at all was configured, so a story can say what is missing rather than look broken. */
export const hasAnyMapApiKey = Object.values(MAP_API_KEYS).some((key) => !!key);
