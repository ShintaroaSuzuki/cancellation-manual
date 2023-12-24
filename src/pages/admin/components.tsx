import React, { Ref, ComponentPropsWithoutRef, createElement } from "react";
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatStrikethrough,
  Code,
  LooksOne,
  LooksTwo,
  Looks3,
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
  format_strikethrough: FormatStrikethrough,
  code: Code,
  looks_one: LooksOne,
  looks_two: LooksTwo,
  looks3: Looks3,
  format_quote: FormatQuote,
  format_list_numbered: FormatListNumbered,
  format_list_bulleted: FormatListBulleted,
  format_align_left: FormatAlignLeft,
  format_align_center: FormatAlignCenter,
  format_align_right: FormatAlignRight,
  format_align_justify: FormatAlignJustify,
};

type ButtonProps = ComponentPropsWithoutRef<"span"> & {
  active?: boolean;
};
export const Button = React.forwardRef(
  ({ className, active, ...props }: ButtonProps, ref: Ref<HTMLSpanElement>) => (
    <span
      {...props}
      className={cn("text-slate-300", active && "text-slate-800", className)}
      ref={ref}
    />
  )
);

type IconProps = ComponentPropsWithoutRef<"span"> & {
  iconName: keyof typeof IconMap;
};
export const Icon = React.forwardRef(
  ({ className, iconName, ...props }: IconProps, ref: Ref<HTMLSpanElement>) => (
    <span {...props} ref={ref}>
      {createElement(IconMap[iconName])}
    </span>
  )
);

export const Menu = React.forwardRef(
  (
    { className, ...props }: ComponentPropsWithoutRef<"div">,
    ref: Ref<HTMLDivElement>
  ) => <div {...props} data-test-id="menu" ref={ref} />
);

export const Toolbar = React.forwardRef(
  (
    { className, ...props }: ComponentPropsWithoutRef<typeof Menu>,
    ref: Ref<HTMLDivElement>
  ) => <Menu {...props} ref={ref} />
);
