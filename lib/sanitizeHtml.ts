// Study guides are model-generated HTML rendered with dangerouslySetInnerHTML. Uploaded documents can carry
// prompt-injection, so strip anything that can execute before it reaches the DOM. (Client-only: needs DOMParser.)

const DANGEROUS_TAGS = 'script,style,iframe,frame,frameset,object,embed,applet,link,meta,base,form,input,button,textarea,select,foreignObject';
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']);

export function sanitizeHtml(html: string): string {
  if (!html || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(DANGEROUS_TAGS).forEach(n => n.remove());
  doc.body.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      // eslint-disable-next-line no-control-regex
      const value = attr.value.replace(/[\u0000- ]/g, '').toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') { el.removeAttribute(attr.name); continue; }
      if (URL_ATTRS.has(name) && /^(javascript|vbscript|data:(?!image\/(png|jpe?g|gif|webp)))/.test(value)) el.removeAttribute(attr.name);
    }
  });
  return doc.body.innerHTML;
}
