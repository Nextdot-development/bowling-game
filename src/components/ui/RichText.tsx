import type { RichText as RichTextValue } from "@/types/game";

/** Renders supplied copy with italic organism and gene names. */
export function RichText({ value }: { value: RichTextValue }) {
  return (
    <>
      {value.map((seg, i) => (typeof seg === "string" ? <span key={i}>{seg}</span> : <em key={i}>{seg.em}</em>))}
    </>
  );
}
