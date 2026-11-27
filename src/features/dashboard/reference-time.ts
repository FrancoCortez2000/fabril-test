/**
 * "Ahora" para los tiempos relativos del tablero. Fuera de la demo es la hora real. En la demo, con
 * datos fijos, es el final del día de referencia (`asOf`); si hay actividad posterior (por ejemplo,
 * de cuando se regeneró la demo), la más nueva, para no mostrar tiempos "en el futuro".
 */
export function referenceTime({
  isDemo,
  asOf,
  activity,
  realNow,
}: {
  isDemo: boolean;
  asOf: string;
  activity: { at: string }[];
  realNow: Date;
}): Date {
  if (!isDemo) return realNow;
  const endOfAsOf = new Date(`${asOf}T23:59:59-03:00`).getTime();
  const newest = Math.max(endOfAsOf, ...activity.map((a) => new Date(a.at).getTime()));
  return new Date(newest);
}
