export const formatDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(`${date}T12:00:00`),
  );

export const age = (date: string) => {
  const days = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000,
    ),
  );
  return days < 31
    ? `${days} days`
    : days < 365
      ? `${Math.floor(days / 30)} months`
      : `${Math.floor(days / 365)} years`;
};
