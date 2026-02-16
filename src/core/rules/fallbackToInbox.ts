export const fallbackInboxNote = (text: string): string => {
  return text
    .replace(/^запиши[:,\s-]*/i, "")
    .replace(/^заметка[:,\s-]*/i, "")
    .trim();
};
