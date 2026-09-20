// Shared between map-sheet.tsx (drag/snap behavior) and
// map-static-surface.tsx (fit-zoom cushion calc, which needs to know the
// sheet's peeked height so pins don't render under it). Neither file
// imports the other; both import this.
export const PEEK_HEIGHT = 96;
export const EXPANDED_RATIO = 0.65;
