import React, { ReactNode, Ref, PropsWithChildren, createElement } from "react";
import ReactDOM from "react-dom";
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  Code,
  LooksOne,
  LooksTwo,
  FormatQuote,
  FormatListNumbered,
  FormatListBulleted,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
} from "@mui/icons-material";
import { cn } from "@/utils";

export const IconMap = {
  format_bold: FormatBold,
  format_italic: FormatItalic,
  format_underlined: FormatUnderlined,
  code: Code,
  looks_one: LooksOne,
  looks_two: LooksTwo,
  format_quote: FormatQuote,
  format_list_numbered: FormatListNumbered,
  format_list_bulleted: FormatListBulleted,
  format_align_left: FormatAlignLeft,
  format_align_center: FormatAlignCenter,
  format_align_right: FormatAlignRight,
  format_align_justify: FormatAlignJustify,
};

interface BaseProps {
  className: string;
  [key: string]: unknown;
}
type OrNull<T> = T | null;

export const Button = React.forwardRef(
  (
    {
      className,
      active,
      reversed,
      ...props
    }: PropsWithChildren<
      {
        active: boolean;
        reversed: boolean;
      } & BaseProps
    >,
    ref: Ref<OrNull<HTMLSpanElement>>
  ) => (
    <span
      {...props}
      className={cn("text-slate-300", active && "text-slate-800", className)}
      ref={ref}
    />
  )
);

export const EditorValue = React.forwardRef(
  (
    {
      className,
      value,
      ...props
    }: PropsWithChildren<
      {
        value: any;
      } & BaseProps
    >,
    ref: Ref<OrNull<null>>
  ) => {
    const textLines = value.document.nodes
      .map((node) => node.text)
      .toArray()
      .join("\n");
    return (
      <div ref={ref} {...props}>
        <div>Slate's value as text</div>
        <div>{textLines}</div>
      </div>
    );
  }
);

export const Icon = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<OrNull<HTMLSpanElement>>
  ) => (
    <span {...props} ref={ref}>
      {createElement(IconMap[props.iconName])}
    </span>
  )
);

export const Instruction = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<OrNull<HTMLDivElement>>
  ) => <div {...props} ref={ref} />
);

export const Menu = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<OrNull<HTMLDivElement>>
  ) => <div {...props} data-test-id="menu" ref={ref} />
);

export const Portal = ({ children }: { children?: ReactNode }) => {
  return typeof document === "object"
    ? ReactDOM.createPortal(children, document.body)
    : null;
};

export const Toolbar = React.forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref: Ref<OrNull<HTMLDivElement>>
  ) => <Menu {...props} ref={ref} />
);
