import { BaseEditor } from "slate";
import { ReactEditor } from "slate-react";
import { HistoryEditor } from "slate-history";

type Align = "left" | "center" | "right" | "justify";

type ParagraphElement = {
  type: "paragraph";
  align?: Align;
  children: CustomText[];
};
type HeadingOneElement = {
  type: "heading-one";
  align?: Align;
  children: CustomText[];
};
type HeadingTwoElement = {
  type: "heading-two";
  align?: Align;
  children: CustomText[];
};
type HeadingThreeElement = {
  type: "heading-three";
  align?: Align;
  children: CustomText[];
};
type BulletedListElement = {
  type: "bulleted-list";
  align?: Align;
  children: CustomText[];
};
type NumberedListElement = {
  type: "numbered-list";
  align?: Align;
  children: CustomText[];
};
type ListItemElement = {
  type: "list-item";
  align?: Align;
  children: CustomText[];
};
type BlockQuoteElement = {
  type: "block-quote";
  align?: Align;
  children: CustomText[];
};
export type LinkElement = {
  type: "link";
  url: string;
  align?: Align;
  children: CustomText[];
};
// type ImageElement = { type: "image"; url: string; align?: Align; children: CustomText[] };

type FormattedText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;
type CustomElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | HeadingThreeElement
  | BulletedListElement
  | NumberedListElement
  | ListItemElement
  | BlockQuoteElement
  | LinkElement;
type CustomText = FormattedText;

declare module "slate" {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
