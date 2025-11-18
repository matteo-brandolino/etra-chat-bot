export function WasteCalendar({ calendarInfo }: { calendarInfo: any }) {
  if (!calendarInfo || !calendarInfo.found) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:bg-yellow-950/50">
        <p className="text-sm">Nessuna informazione trovata per questa ricerca.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🗑️</span>
        <h3 className="font-semibold">Calendario Raccolta Rifiuti</h3>
      </div>
      <div className="space-y-2">
        {calendarInfo.results.map((result: string, index: number) => (
          <div
            key={index}
            className="rounded-md bg-muted/50 p-3 text-sm"
          >
            {result}
          </div>
        ))}
      </div>
    </div>
  );
}
