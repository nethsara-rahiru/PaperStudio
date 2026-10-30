import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
const extensions = [StreamLanguage.define(stex)];
export default function SourceEditor({ source, onChange }) {
  return (
    <CodeMirror
      value={source}
      onChange={onChange}
      extensions={extensions}
      height="100%"
      basicSetup={{
        foldGutter: true,
        autocompletion: false,
        highlightActiveLine: true,
      }}
      aria-label="LaTeX source editor"
    />
  );
}
