declare module '@editorjs/checklist' {
  // Package ships without types; treat as an Editor.js block tool constructor.
  const Checklist: new (...args: never[]) => unknown
  export default Checklist
}
