function createJwtBlacklistService(dbQuery) {
  async function revokeToken(decoded) {
    const jti = String(decoded?.jti || '').trim();
    const exp = Number(decoded?.exp);
    const email = String(decoded?.email || '').trim().toLowerCase();
    if (!jti || !Number.isFinite(exp)) return;

    const expiresAt = new Date(exp * 1000);
    if (expiresAt <= new Date()) return;

    await dbQuery(
      `INSERT INTO jwt_token_blacklist (jti, user_email, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at), revoked_at = CURRENT_TIMESTAMP`,
      [jti, email, expiresAt]
    );
  }

  async function isRevoked(jti) {
    const id = String(jti || '').trim();
    if (!id) return false;
    const rows = await dbQuery(
      'SELECT 1 AS ok FROM jwt_token_blacklist WHERE jti = ? AND expires_at > NOW() LIMIT 1',
      [id]
    );
    return Boolean(rows?.length);
  }

  async function purgeExpired() {
    await dbQuery('DELETE FROM jwt_token_blacklist WHERE expires_at <= NOW()');
  }

  return { revokeToken, isRevoked, purgeExpired };
}

module.exports = { createJwtBlacklistService };
