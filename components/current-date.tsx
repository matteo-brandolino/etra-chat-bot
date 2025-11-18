export function CurrentDate({ dateInfo }: { dateInfo: any }) {
  if (!dateInfo) return null;

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">📅</span>
        <h3 className="font-semibold">Data Corrente</h3>
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-medium">{dateInfo.formatted}</p>
        <p className="text-muted-foreground">Formato ISO: {dateInfo.date}</p>
      </div>
    </div>
  );
}
