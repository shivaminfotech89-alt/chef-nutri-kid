// ─────────────────────────────────────────────
// Chef Nutri-Kid — Freemium Gate
// Free users: 1 recipe generation only.
// Locked features: Child Profiles, Health Report,
//                  Weekly Planner, Recipe Box save.
// ─────────────────────────────────────────────

const KEYS = {
  recipeUsed: 'cnk_recipe_used',      // 'true' after first generation
  isPremium:  'cnk_is_premium',       // 'true' after entering unlock code
};

export const FREE_LIMIT = 1; // number of free recipe generations

export const freemium = {
  /** How many recipe generations the user has done */
  getUsageCount(): number {
    return localStorage.getItem(KEYS.recipeUsed) === 'true' ? 1 : 0;
  },

  /** Mark that the user has used their free generation */
  markUsed(): void {
    localStorage.setItem(KEYS.recipeUsed, 'true');
  },

  /** Has the user already used their free generation? */
  hasUsedFree(): boolean {
    return localStorage.getItem(KEYS.recipeUsed) === 'true';
  },

  /** Is this user a paid/premium user? */
  isPremium(): boolean {
    return localStorage.getItem(KEYS.isPremium) === 'true';
  },

  /** Unlock premium (called when valid code is entered) */
  unlock(code: string): boolean {
    // Simple code check — replace these with codes you generate per customer
    const VALID_CODES = [
      'NUTRI-STARTER', 'NUTRI-FAMILY', 'NUTRI-PREMIUM',
      'CNK2026-S', 'CNK2026-F', 'CNK2026-P',
    ];
    if (VALID_CODES.includes(code.trim().toUpperCase())) {
      localStorage.setItem(KEYS.isPremium, 'true');
      return true;
    }
    return false;
  },

  /** Reset (for testing only) */
  reset(): void {
    localStorage.removeItem(KEYS.recipeUsed);
    localStorage.removeItem(KEYS.isPremium);
  },

  /** Can user generate a recipe right now? */
  canGenerate(): boolean {
    return this.isPremium() || !this.hasUsedFree();
  },

  /** Can user access locked features? */
  canAccessPremium(): boolean {
    return this.isPremium();
  },
};
