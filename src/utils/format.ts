export const formatCredits = (value: number): string =>
  `${value.toLocaleString("en-US")} cr`;

export const titleCase = (value: string): string =>
  value
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
