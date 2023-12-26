import React, {
  useCallback,
  useMemo,
  useRef,
  Ref,
  ComponentPropsWithRef,
  ReactNode,
} from "react";
import imageExtensions from "image-extensions";
import isHotkey, { isKeyHotkey } from "is-hotkey";
import isUrl from "is-url";
import {
  Editable,
  withReact,
  useSlate,
  useSlateStatic,
  Slate,
  useSelected,
  useFocused,
  ReactEditor,
} from "slate-react";
import {
  Editor,
  Transforms,
  createEditor,
  Descendant,
  Element as SlateElement,
  Text as SlateText,
  Range,
} from "slate";
import { withHistory } from "slate-history";
import { cn } from "@/utils";
import { LinkElement, ImageElement, YoutubeElement } from "@/utils/admin/types";

import { Button, Icon, Toolbar, IconMap } from "@/components/admin";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

const BACKEND_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_ENDPOINT;
const IMAGE_HOST_URL = process.env.NEXT_PUBLIC_IMAGE_HOST_URL;

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
  const editor = useMemo(
    () =>
      withYoutube(
        withImages(withInlines(withHistory(withReact(createEditor()))))
      ),
    []
  );

  return (
    <div className="w-full h-full flex flex-col items-center p-8">
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={(value) => {
          const isAstChange = editor.operations.some(
            (op) => "set_selection" !== op.type
          );
          if (isAstChange) {
            const content = JSON.stringify(value);
            console.log(content);
          }
        }}
      >
        <Toolbar className="inline-flex justify-center items-center h-12 px-4 drop-shadow bg-slate-100 fixed bottom-8 right-8 gap-x-2 z-30">
          <MarkButton format="bold" iconName="format_bold" />
          <MarkButton format="italic" iconName="format_italic" />
          <MarkButton format="underline" iconName="format_underlined" />
          <MarkButton format="strikethrough" iconName="format_strikethrough" />
          <MarkButton format="code" iconName="code" />
          <AddLinkButton />
          <RemoveLinkButton />
          <InsertImageButton />
          <InsertYoutubeButton />
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
          placeholder="解約マニュアルを作成してください"
          spellCheck={false} // true にするとスペスミスで破線が引かれる
          autoFocus={true}
          className="prose prose-code:before:hidden prose-code:after:hidden prose-code:bg-slate-200 prose-code:p-1 outline-none w-full"
          onPaste={(event) => {
            const pastedText = event.clipboardData?.getData("text")?.trim();
            const videoId = extractYoutubeVideoId(pastedText);
            if (videoId != null) {
              // the first regex match will contain the entire url,
              // the second will contain the first capture group which is our video id
              event.preventDefault();
              insertYoutube(editor, videoId);
            }
          }}
          onKeyDown={(event) => {
            for (const hotkey in HOTKEYS) {
              if (isHotkey(hotkey, event as any)) {
                event.preventDefault();
                const mark = HOTKEYS[hotkey as keyof typeof HOTKEYS];
                toggleMark(editor, mark as Exclude<keyof SlateText, "text">);
              }
            }
            const { selection } = editor;
            // Default left/right behavior is unit:'character'.
            // This fails to distinguish between two cursor positions, such as
            // <inline>foo<cursor/></inline> vs <inline>foo</inline><cursor/>.
            // Here we modify the behavior to unit:'offset'.
            // This lets the user step into and out of the inline without stepping over characters.
            // You may wish to customize this further to only use unit:'offset' in specific cases.
            if (selection && Range.isCollapsed(selection)) {
              const { nativeEvent } = event;
              if (isKeyHotkey("left", nativeEvent)) {
                event.preventDefault();
                Transforms.move(editor, { unit: "offset", reverse: true });
                return;
              }
              if (isKeyHotkey("right", nativeEvent)) {
                event.preventDefault();
                Transforms.move(editor, { unit: "offset" });
                return;
              }
            }
          }}
        />
      </Slate>
    </div>
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
    case "link":
      return (
        <LinkComponent {...attributes} element={element}>
          {children}
        </LinkComponent>
      );
    case "image":
      return (
        <Image {...attributes} element={element} alt="image">
          {children}
        </Image>
      );
    case "youtube":
      return (
        <Youtube {...attributes} element={element}>
          {children}
        </Youtube>
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

const withInlines = (editor: Editor) => {
  const { insertData, insertText, isInline, isSelectable } = editor;

  editor.isInline = (element: SlateElement) =>
    ["link", "button", "badge"].includes(element.type) || isInline(element);

  editor.isSelectable = (element) => isSelectable(element);

  editor.insertText = (text) => {
    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertText(text);
    }
  };

  editor.insertData = (data) => {
    const text = data.getData("text/plain");

    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertData(data);
    }
  };

  return editor;
};

const insertLink = (editor: Editor, url: string) => {
  if (editor.selection) {
    wrapLink(editor, url);
  }
};

const isLinkActive = (editor: Editor) => {
  const [link] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "link",
  });
  return !!link;
};

const unwrapLink = (editor: Editor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "link",
  });
};

const wrapLink = (editor: Editor, url: string) => {
  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }

  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);
  const link: LinkElement = {
    type: "link",
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: "end" });
  }
};

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
const InlineChromiumBugfix = () => (
  <span contentEditable={false} className="text-[0px]">
    {String.fromCodePoint(160) /* Non-breaking space */}
  </span>
);

const LinkComponent = React.forwardRef(
  (
    {
      attributes,
      children,
      element,
    }: {
      attributes: any;
      children: ReactNode;
      element: LinkElement;
    },
    ref: Ref<HTMLLinkElement>
  ) => {
    const selected = useSelected();
    return (
      <a
        {...attributes}
        href={element.url}
        ref={ref}
        className={cn(
          selected && "bg-slate-200",
          "rounded-sm",
          "text-blue-600"
        )}
      >
        <InlineChromiumBugfix />
        {children}
        <InlineChromiumBugfix />
      </a>
    );
  }
);
LinkComponent.displayName = "LinkComponent";

const AddLinkButton = () => {
  const editor = useSlate();
  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={(event: React.MouseEvent) => {
        event.preventDefault();
        const url = window.prompt("Enter the URL of the link:");
        if (!url) return;
        insertLink(editor, url);
      }}
    >
      <Icon iconName="link" />
    </Button>
  );
};

const RemoveLinkButton = () => {
  const editor = useSlate();

  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={(_event: React.MouseEvent) => {
        if (isLinkActive(editor)) {
          unwrapLink(editor);
        }
      }}
    >
      <Icon iconName="link_off" />
    </Button>
  );
};

const withImages = (editor: Editor) => {
  const { insertData, isVoid } = editor;

  editor.isVoid = (element: SlateElement) => {
    return element.type === "image" ? true : isVoid(element);
  };

  editor.insertData = async (data) => {
    const text = data.getData("text/plain");
    const { files } = data;

    if (files && files.length > 0) {
      for (const file of files) {
        const reader = new FileReader();
        const [mime] = file.type.split("/");

        if (mime === "image") {
          const url = await uploadImage(file);
          if (url === undefined) return;
          insertImage(editor, url);
        }
      }
    } else if (isImageUrl(text)) {
      try {
        const blob = await fetch(text).then((res) => res.blob());
        const file = new File([blob], "image.png", { type: "image/png" });
        const url = await uploadImage(file);
        if (url === undefined) return;
        insertImage(editor, url);
      } catch {
        alert("画像のアップロードに失敗しました");
        return;
      }
    } else {
      insertData(data);
    }
  };

  return editor;
};

const insertImage = (editor: Editor, url: string) => {
  const text = { text: "" };
  const image: ImageElement = { type: "image", url, children: [text] };
  Transforms.insertNodes(editor, image);
};

const removeImage = async (
  editor: Editor,
  path: number[],
  element: ImageElement
) => {
  const filepath = element.url.split("/").slice(-1)[0];
  const res = await fetch(`${BACKEND_ENDPOINT}/images`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filepath,
    }),
  });
  if (!res.ok) {
    alert("画像の削除に失敗しました");
    return;
  }
  Transforms.removeNodes(editor, { at: path });
};

const Image = React.forwardRef(
  (
    {
      attributes,
      children,
      element,
    }: {
      attributes: any;
      children: ReactNode;
      element: ImageElement;
    },
    ref: Ref<HTMLDivElement>
  ) => {
    const editor = useSlateStatic();
    const path = ReactEditor.findPath(editor, element);

    const selected = useSelected();
    const focused = useFocused();
    return (
      <div {...attributes}>
        <div contentEditable={false} className="relative">
          <img
            src={element.url}
            className={cn(
              "block max-w-full max-h-80",
              selected && focused && "outline outline-4 outline-blue-500"
            )}
            alt="image"
          />
          <Button
            active
            onClick={() => removeImage(editor, path, element)}
            className={cn(
              "absolute bg-white top-4 left-4 text-red-500 z-20",
              selected && focused ? "inline" : "hidden"
            )}
          >
            <Icon iconName="delete" />
          </Button>
          {/* This is a workaround for a Chromium bug where the image is not selectable */}
          <div
            ref={ref}
            className={cn(
              "absolute top-0 left-0 w-full h-full z-10",
              selected && "hidden"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);
Image.displayName = "Image";

const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BACKEND_ENDPOINT}/images`, {
    method: "PUT",
    // multipart/form-data にしたい場合は、Content-Type を指定せずに、ブラウザに任せる必要がある
    // headers: {
    //   "Content-Type": "multipart/form-data",
    // },
    body: formData,
  });
  if (!res.ok) {
    alert("画像のアップロードに失敗しました");
    return;
  }
  const { filepath } = await res.json();
  return `${IMAGE_HOST_URL}/${filepath}`;
};

const InsertImageButton = () => {
  const editor = useSlateStatic();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("選択されたファイルは画像ではありません");
      return;
    }
    const url = await uploadImage(file);
    if (url === undefined) return;
    insertImage(editor, url);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        onMouseDown={(event) => {
          event.preventDefault();
          handleClick();
        }}
      >
        <Icon iconName="image" />
      </Button>
    </div>
  );
};

const isImageUrl = (url: string) => {
  if (!url) return false;
  if (!isUrl(url)) return false;
  const ext = new URL(url).pathname.split(".").pop();
  if (ext === undefined) return false;
  return imageExtensions.includes(ext);
};

const withYoutube = (editor: Editor) => {
  const { insertData, isVoid } = editor;

  editor.isVoid = (element: SlateElement) => {
    return element.type === "youtube" ? true : isVoid(element);
  };

  return editor;
};

const Youtube = React.forwardRef(
  (
    {
      attributes,
      children,
      element,
    }: {
      attributes: any;
      children: ReactNode;
      element: YoutubeElement;
    },
    ref: Ref<HTMLDivElement>
  ) => {
    const editor = useSlateStatic();
    const path = ReactEditor.findPath(editor, element);

    const selected = useSelected();
    const focused = useFocused();
    return (
      <div {...attributes}>
        <div
          contentEditable={false}
          className={cn(
            "relative",
            selected && focused && "outline outline-4 outline-blue-500"
          )}
        >
          <LiteYouTubeEmbed id={element.videoId} title="YouTube Embed" />
          <Button
            active
            onClick={() => Transforms.removeNodes(editor, { at: path })}
            className={cn(
              "absolute bg-white top-4 left-4 text-red-500 z-20",
              selected && focused ? "inline" : "hidden"
            )}
          >
            <Icon iconName="delete" />
          </Button>
          {/* This is a workaround for a Chromium bug where the image is not selectable */}
          <div
            ref={ref}
            className={cn(
              "absolute top-0 left-0 w-full h-full z-10",
              selected && "hidden"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);
Youtube.displayName = "Youtube";

const InsertYoutubeButton = () => {
  const editor = useSlateStatic();
  return (
    <Button
      onMouseDown={(event) => {
        event.preventDefault();
        const url = window.prompt("YouTube の動画リンクを入力してください");
        const videoId = extractYoutubeVideoId(url);
        if (url === null) return;
        if (videoId === null) {
          alert("YouTube の動画リンクではありません");
          return;
        }
        insertYoutube(editor, videoId);
      }}
    >
      <Icon iconName="youtube" />
    </Button>
  );
};

const extractYoutubeVideoId = (url: string | null) => {
  if (url === null) return null;
  const youtubeRegex =
    /^(?:(?:https?:)?\/\/)?(?:(?:www|m)\.)?(?:(?:youtube\.com|youtu.be))(?:\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(?:\S+)?$/;
  const matches = url.match(youtubeRegex);
  if (matches === null) return null;
  const [_, videoId] = matches;
  return videoId;
};

const insertYoutube = (editor: Editor, videoId: string) => {
  Transforms.insertNodes(editor, {
    type: "youtube",
    videoId,
    children: [
      {
        text: "",
      },
    ],
  });
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
