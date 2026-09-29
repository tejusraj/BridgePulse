export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const Ï†1 = (lat1 * Math.PI) / 180; // Ï†, Î» in radians
  const Ï†2 = (lat2 * Math.PI) / 180;
  const Î”Ï† = ((lat2 - lat1) * Math.PI) / 180;
  const Î”Î» = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Î”Ï† / 2) * Math.sin(Î”Ï† / 2) +
    Math.cos(Ï†1) * Math.cos(Ï†2) * Math.sin(Î”Î» / 2) * Math.sin(Î”Î» / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}
