import React, {
  useCallback,
  useMemo,
  ComponentPropsWithRef,
  ReactNode,
} from "react";
import isHotkey from "is-hotkey";
import { Editable, withReact, useSlate, Slate } from "slate-react";
import {
  Editor,
  Transforms,
  createEditor,
  Descendant,
  Element as SlateElement,
  Text as SlateText,
} from "slate";
import { withHistory } from "slate-history";
import { cn } from "@/utils";

import { Button, Icon, Toolbar, IconMap } from "../components";

const HOTKEYS = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+u": "underline",
  "mod+`": "code",
  "mod+shift+~": "strikethrough",
};

const LIST_TYPES = ["numbered-list", "bulleted-list"];
const TEXT_ALIGN_TYPES = ["left", "center", "right", "justify"];

const RichTextExample = () => {
  const renderElement = useCallback(
    (props: ComponentPropsWithRef<typeof Element>) => <Element {...props} />,
    []
  );
  const renderLeaf = useCallback(
    (props: ComponentPropsWithRef<typeof Leaf>) => <Leaf {...props} />,
    []
  );
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Toolbar>
        <MarkButton format="bold" iconName="format_bold" />
        <MarkButton format="italic" iconName="format_italic" />
        <MarkButton format="underline" iconName="format_underlined" />
        <MarkButton format="strikethrough" iconName="format_strikethrough" />
        <MarkButton format="code" iconName="code" />
        <BlockButton format="heading-one" iconName="looks_one" />
        <BlockButton format="heading-two" iconName="looks_two" />
        <BlockButton format="heading-three" iconName="looks3" />
        <BlockButton format="block-quote" iconName="format_quote" />
        <BlockButton format="numbered-list" iconName="format_list_numbered" />
        <BlockButton format="bulleted-list" iconName="format_list_bulleted" />
        <BlockButton format="left" iconName="format_align_left" />
        <BlockButton format="center" iconName="format_align_center" />
        <BlockButton format="right" iconName="format_align_right" />
        <BlockButton format="justify" iconName="format_align_justify" />
      </Toolbar>
      <Editable
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder="Enter some rich text…"
        spellCheck={false} // true にするとスペスミスで破線が引かれる
        autoFocus={true}
        className="prose prose-code:before:hidden prose-code:after:hidden prose-code:bg-slate-100 prose-code:p-1 m-8 outline-none"
        onKeyDown={(event) => {
          for (const hotkey in HOTKEYS) {
            if (isHotkey(hotkey, event as any)) {
              event.preventDefault();
              const mark = HOTKEYS[hotkey as keyof typeof HOTKEYS];
              toggleMark(editor, mark as Exclude<keyof SlateText, "text">);
            }
          }
        }}
      />
    </Slate>
  );
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? "align" : "type"
  );
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  });
  let newProperties: Partial<SlateElement>;
  if (TEXT_ALIGN_TYPES.includes(format)) {
    newProperties = {
      align: isActive ? undefined : (format as SlateElement["align"]),
    };
  } else {
    newProperties = {
      type: isActive
        ? "paragraph"
        : isList
        ? "list-item"
        : (format as SlateElement["type"]),
    };
  }
  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = {
      type: format as "bulleted-list" | "numbered-list",
      children: [],
    };
    Transforms.wrapNodes(editor, block);
  }
};

const toggleMark = (
  editor: Editor,
  format: Exclude<keyof SlateText, "text">
) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (
  editor: Editor,
  format: string,
  blockType: keyof SlateElement = "type"
) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n[blockType] === format,
    })
  );

  return !!match;
};

const isMarkActive = (
  editor: Editor,
  format: Exclude<keyof SlateText, "text">
) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

const Element = ({
  attributes,
  children,
  element,
}: {
  attributes: any;
  children: ReactNode;
  element: SlateElement;
}) => {
  const defaultStyle = `text-${element.align}`;
  switch (element.type) {
    case "block-quote":
      return (
        <blockquote className={cn(defaultStyle)} {...attributes}>
          {children}
        </blockquote>
      );
    case "bulleted-list":
      return (
        <ul className={cn(defaultStyle)} {...attributes}>
          {children}
        </ul>
      );
    case "heading-one":
      return (
        <h1 className={cn(defaultStyle)} {...attributes}>
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2 className={cn(defaultStyle)} {...attributes}>
          {children}
        </h2>
      );
    case "heading-three":
      return <h3 {...attributes}>{children}</h3>;
    case "list-item":
      return (
        <li className={cn(defaultStyle)} {...attributes}>
          {children}
        </li>
      );
    case "numbered-list":
      return (
        <ol className={cn(defaultStyle)} {...attributes}>
          {children}
        </ol>
      );
    default:
      return (
        <p className={cn(defaultStyle)} {...attributes}>
          {children}
        </p>
      );
  }
};

const Leaf = ({
  attributes,
  children,
  leaf,
}: {
  attributes: any;
  children: ReactNode;
  leaf: SlateText;
}) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  if (leaf.strikethrough) {
    children = <s>{children}</s>;
  }

  return <span {...attributes}>{children}</span>;
};

const BlockButton = ({
  format,
  iconName,
}: {
  format: string;
  iconName: keyof typeof IconMap;
}) => {
  const editor = useSlate();
  return (
    <Button
      active={isBlockActive(
        editor,
        format,
        TEXT_ALIGN_TYPES.includes(format) ? "align" : "type"
      )}
      onMouseDown={(event: React.MouseEvent) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      <Icon iconName={iconName} />
    </Button>
  );
};

const MarkButton = ({
  format,
  iconName,
}: {
  format: Exclude<keyof SlateText, "text">;
  iconName: keyof typeof IconMap;
}) => {
  const editor = useSlate();
  return (
    <Button
      active={isMarkActive(editor, format)}
      onMouseDown={(event: React.MouseEvent) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      <Icon iconName={iconName} />
    </Button>
  );
};

const initialValue: Descendant[] = [
  {
    type: "paragraph",
    children: [
      { text: "This is editable " },
      { text: "rich", bold: true },
      { text: " text, " },
      { text: "much", italic: true },
      { text: " better than a " },
      { text: "<textarea>", code: true },
      { text: "!" },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        text: "Since it's rich text, you can do things like turn a selection of text ",
      },
      { text: "bold", bold: true },
      {
        text: ", or add a semantically rendered block quote in the middle of the page, like this:",
      },
    ],
  },
  {
    type: "block-quote",
    children: [{ text: "A wise quote." }],
  },
  {
    type: "paragraph",
    align: "center",
    children: [{ text: "Try it out for yourself!" }],
  },
];

export default RichTextExample;
