export function ZoneInfo({ zoneInfo }: { zoneInfo: any }) {
  if (!zoneInfo) return null;

  if (zoneInfo.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:bg-red-950/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⚠️</span>
          <h3 className="font-semibold">Errore</h3>
        </div>
        <p className="text-sm">{zoneInfo.error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">📍</span>
        <h3 className="font-semibold">Informazioni Zona</h3>
      </div>
      <div className="space-y-2">
        <div className="rounded-md bg-primary/10 p-3">
          <p className="text-sm text-muted-foreground mb-1">Zona di raccolta</p>
          <p className="text-2xl font-bold text-primary">{zoneInfo.zone}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Utilizza questa zona per cercare il calendario di raccolta specifico.
        </p>
      </div>
    </div>
  );
}
