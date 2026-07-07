export type TimeOption = {
  value: string;
  label: string;
};

export function generateTimeOptions(
  openingTime: string,
  closingTime: string,
  intervalMinutes: number,
): TimeOption[] {
  const options: TimeOption[] = [];
  const [openH, openM] = openingTime.split(":").map(Number);
  const [closeH, closeM] = closingTime.split(":").map(Number);

  let currentMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  while (currentMinutes <= closeMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    const period = hours >= 12 ? "PM" : "AM";
    const displayH = hours % 12 || 12;
    const value = `${displayH}:${String(mins).padStart(2, "0")} ${period}`;
    options.push({ value, label: value });
    currentMinutes += intervalMinutes;
  }

  return options;
}
