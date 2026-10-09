// Variante B: Cloudflare-Worker mit Cron-Trigger. Stößt alle paar Stunden einen neuen
// Pages-Build an, damit die Gig-Liste aktuell bleibt.
export default {
  async scheduled(event, env, ctx) {
    const r = await fetch(env.DEPLOY_HOOK, { method: 'POST' });
    if (!r.ok) throw new Error('Deploy-Hook fehlgeschlagen: ' + r.status);
  }
};
