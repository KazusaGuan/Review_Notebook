window.__ModuleLoader__.load({
  id: '@local/dsh-review-notes',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = React

    const STATE_API = '/review-notes/api/state'
    const IMAGE_API = '/review-notes/api/image'
    const IMAGE_BASE = '/review-notes/images/'
    const MAX_SUMMARY = 300
    const MAX_NAME = 60
    const MAX_TITLE = 60
    const MAX_IMAGE_BYTES = 20 * 1024 * 1024
    const ACCEPTED_IMAGE = /^image\/(png|jpeg|webp|gif)$/
    const SELECTION_KEY = 'dsh-review-notes.selection.v1'
    const STYLE_ID = 'dsh-review-notes-styles'

    const CSS = `
.rn-root {
  height: 100%; min-height: 0; display: flex; flex-direction: column;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 13px; line-height: 1.55; -webkit-font-smoothing: antialiased;
}
.rn-root *, .rn-root *::before, .rn-root *::after { box-sizing: border-box; }
.rn-root button { font-family: inherit; }
.rn-root button:focus-visible, .rn-root input:focus-visible, .rn-root textarea:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.rn-top {
  flex: none; display: flex; align-items: center; gap: 14px; padding: 13px 20px;
  border-bottom: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1);
}
.rn-title { min-width: 0; }
.rn-title h1 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: .01em; }
.rn-title p { margin: 2px 0 0; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.rn-top-stats { margin-left: auto; display: flex; align-items: center; gap: 14px; font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.rn-top-stats b { color: var(--dsw-alias-label-primary); font-size: 13px; font-variant-numeric: tabular-nums; margin-right: 2px; }
.rn-saving { color: var(--dsw-alias-brand-primary); }
.rn-savebar {
  flex: none; display: flex; align-items: center; gap: 10px; padding: 6px 20px;
  background: color-mix(in srgb, #e5484d 12%, transparent); color: #d33d42; font-size: 11.5px;
}
.rn-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 224px 186px minmax(0, 1fr); }
@media (max-width: 1080px) { .rn-body { grid-template-columns: 190px 158px minmax(0, 1fr); } }
.rn-col { min-height: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1); }
.rn-col + .rn-col { border-left: 1px solid var(--dsw-alias-border-l1); }
.rn-col-head { flex: none; display: flex; align-items: center; gap: 8px; padding: 9px 10px 9px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rn-col-title { font-size: 11px; font-weight: 600; letter-spacing: .04em; color: var(--dsw-alias-label-secondary); }
.rn-col-actions { margin-left: auto; display: flex; gap: 4px; }
.rn-scroll { flex: 1; min-height: 0; overflow: auto; padding: 6px; }
.rn-row {
  position: relative; display: flex; align-items: center; gap: 7px; padding: 8px 9px;
  border-radius: 8px; cursor: pointer; user-select: none; transition: background .12s;
}
.rn-row:hover { background: var(--dsw-alias-bg-layer-2); }
.rn-row.is-active { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 13%, transparent); }
.rn-row-mark { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-label-secondary); opacity: .55; }
.rn-row.is-active .rn-row-mark { background: var(--dsw-alias-brand-primary); opacity: 1; }
.rn-row-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
.rn-row.is-active .rn-row-name { font-weight: 600; }
.rn-row-count { flex: none; font-size: 10px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.rn-row-actions { display: flex; flex: none; gap: 2px; align-items: center; opacity: 0; pointer-events: none; transition: opacity .12s; }
.rn-row:hover .rn-row-actions, .rn-row.is-active .rn-row-actions { opacity: 1; pointer-events: auto; }
.rn-icon-btn {
  border: 0; background: transparent; color: var(--dsw-alias-label-secondary);
  width: 21px; height: 21px; border-radius: 6px; cursor: pointer; font-size: 12px;
  line-height: 1; display: grid; place-items: center; padding: 0;
}
.rn-icon-btn:hover { background: rgba(127, 127, 127, .16); color: var(--dsw-alias-label-primary); }
.rn-btn {
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary); border-radius: 7px; padding: 5px 11px;
  font-size: 12px; line-height: 1.4; cursor: pointer; white-space: nowrap;
}
.rn-btn:hover { background: var(--dsw-alias-bg-layer-2); }
.rn-btn:disabled { opacity: .45; cursor: not-allowed; }
.rn-btn-sm { padding: 3px 8px; font-size: 11.5px; border-radius: 6px; }
.rn-btn-primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: #fff; }
.rn-btn-primary:hover { background: var(--dsw-alias-brand-primary); filter: brightness(1.06); }
.rn-btn-ghost { border-color: transparent; background: transparent; color: var(--dsw-alias-label-secondary); }
.rn-btn-ghost:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.rn-btn-danger { color: #d33d42; }
.rn-btn-danger:hover { background: color-mix(in srgb, #e5484d 12%, transparent); }
.rn-muted { color: var(--dsw-alias-label-secondary); }
.rn-create { display: flex; flex-direction: column; gap: 6px; padding: 8px; }
.rn-create-row { display: flex; gap: 6px; }
.rn-input, .rn-textarea {
  width: 100%; min-width: 0; border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base); color: inherit; border-radius: 7px;
  padding: 6px 8px; font: inherit; font-size: 12.5px; line-height: 1.55; outline: none;
}
.rn-input:focus, .rn-textarea:focus { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); }
.rn-textarea { resize: vertical; min-height: 76px; }
.rn-counter { align-self: flex-end; margin-top: -2px; font-size: 10.5px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.rn-page { min-height: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); }
.rn-page-head { flex: none; display: flex; align-items: flex-start; gap: 12px; padding: 14px 20px 10px; }
.rn-page-head h2 { margin: 0; font-size: 16px; font-weight: 650; letter-spacing: -.005em; }
.rn-page-sub { margin: 2px 0 0; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.rn-page-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.rn-page-scroll { flex: 1; min-height: 0; overflow: auto; padding: 0 20px 28px; }
.rn-drop {
  display: flex; align-items: center; gap: 12px; padding: 13px 15px; margin: 0 0 16px;
  border: 1.5px dashed var(--dsw-alias-border-l1); border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1); cursor: pointer; transition: border-color .15s, background .15s;
}
.rn-drop:hover, .rn-drop.is-over { border-color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 6%, var(--dsw-alias-bg-layer-1)); }
.rn-drop-icon {
  flex: none; width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);
  color: var(--dsw-alias-brand-primary); font-size: 19px; line-height: 1;
}
.rn-drop b { display: block; font-size: 12.5px; font-weight: 600; }
.rn-drop span { display: block; margin-top: 1px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.rn-drop-tip { flex: none; margin-left: auto; font-size: 10.5px; color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; padding: 2px 7px; }
.rn-cards { display: flex; flex-direction: column; gap: 14px; }
.rn-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.rn-thumb {
  display: block; width: 100%; padding: 0; border: 0; border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent); cursor: zoom-in;
  max-height: 420px; overflow: hidden;
}
.rn-thumb img { display: block; width: 100%; max-height: 420px; object-fit: contain; }
.rn-card-body { position: relative; z-index: 1; padding: 11px 14px 9px; }
.rn-summary { margin: 0; padding-left: 10px; border-left: 3px solid var(--dsw-alias-brand-primary); font-size: 13px; line-height: 1.65; overflow-wrap: anywhere; white-space: pre-wrap; }
.rn-summary-row { display: flex; align-items: flex-start; gap: 8px; }
.rn-summary-row .rn-summary { flex: 1; min-width: 0; }
.rn-summary-edit { flex: none; margin-top: 3px; opacity: .72; }
.rn-summary-edit:hover { opacity: 1; }
.rn-card-meta { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 10px; font-size: 10.5px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.rn-card-actions { margin-top: 9px; padding-top: 8px; border-top: 1px solid var(--dsw-alias-border-l1); display: flex; flex-wrap: wrap; gap: 6px; row-gap: 6px; justify-content: flex-end; align-items: center; position: relative; z-index: 2; }
.rn-card-actions .rn-btn { flex: none; padding: 4px 10px; }
.rn-page-actions .rn-btn { flex: none; }
.rn-edit { display: flex; flex-direction: column; gap: 7px; }
.rn-edit-actions { display: flex; gap: 6px; justify-content: flex-end; }
.rn-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; padding: 52px 22px; color: var(--dsw-alias-label-secondary); }
.rn-empty-icon {
  width: 50px; height: 50px; border-radius: 15px; display: grid; place-items: center;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-brand-primary); font-size: 22px;
}
.rn-empty b { color: var(--dsw-alias-label-primary); font-size: 13.5px; }
.rn-empty p { margin: 0; max-width: 42ch; font-size: 11.8px; }
.rn-overlay { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 32px; background: rgba(0, 0, 0, .46); }
.rn-dialog { width: min(720px, 94vw); max-height: 90vh; overflow: auto; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; box-shadow: 0 24px 60px rgba(0, 0, 0, .35); }
.rn-dialog-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rn-dialog-head b { font-size: 13.5px; }
.rn-dialog-head p { margin: 1px 0 0; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.rn-dialog-body { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; }
.rn-dialog-foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--dsw-alias-border-l1); }
.rn-dialog-foot .rn-grow { flex: 1; }
.rn-preview { display: grid; place-items: center; max-height: 320px; overflow: hidden; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent); }
.rn-preview img { display: block; max-width: 100%; max-height: 320px; object-fit: contain; }
.rn-lightbox { position: fixed; inset: 0; z-index: 90; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 28px; background: rgba(0, 0, 0, .8); cursor: zoom-out; }
.rn-lightbox img { max-width: 94vw; max-height: 82vh; object-fit: contain; border-radius: 6px; box-shadow: 0 18px 60px rgba(0, 0, 0, .5); }
.rn-lightbox p { margin: 0; max-width: 82ch; color: #f2f2f3; font-size: 13px; line-height: 1.6; text-align: center; white-space: pre-wrap; }
.rn-lightbox small { color: #b9b9be; font-size: 10.5px; }
.rn-toast { pointer-events: none; position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); z-index: 100; max-width: min(620px, 90vw); padding: 9px 15px; border-radius: 9px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); box-shadow: 0 10px 32px rgba(0, 0, 0, .25); font-size: 12.5px; }
.rn-toast.is-error { border-color: #e5484d; color: #d33d42; }
`

    function installStyles() {
      let style = document.getElementById(STYLE_ID)
      if (!style) {
        style = document.createElement('style')
        style.id = STYLE_ID
        document.head.appendChild(style)
      }
      style.textContent = CSS
      return () => {
        if (style && style.parentNode) style.parentNode.removeChild(style)
      }
    }

    function cloneDoc(doc) {
      return typeof structuredClone === 'function' ? structuredClone(doc) : JSON.parse(JSON.stringify(doc))
    }

    function newId() {
      if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID()
      return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
    }

    function now() {
      return Date.now()
    }

    function normalizeClientDoc(raw) {
      const notebooks = raw && Array.isArray(raw.notebooks) ? raw.notebooks : []
      return { version: 1, notebooks }
    }

    function pickNotebook(doc, id) {
      if (!doc || !id) return null
      return doc.notebooks.find((notebook) => notebook.id === id) || null
    }

    function pickPage(notebook, id) {
      if (!notebook || !id) return null
      return notebook.pages.find((page) => page.id === id) || null
    }

    function findPageEverywhere(doc, pageId) {
      if (!doc || !pageId) return null
      for (const notebook of doc.notebooks) {
        const page = notebook.pages.find((candidate) => candidate.id === pageId)
        if (page) return { notebook, page }
      }
      return null
    }

    function countNotes(doc) {
      if (!doc) return 0
      let total = 0
      for (const notebook of doc.notebooks) {
        for (const page of notebook.pages) total += page.cards.length
      }
      return total
    }

    function countPages(doc) {
      if (!doc) return 0
      let total = 0
      for (const notebook of doc.notebooks) total += notebook.pages.length
      return total
    }

    function readSelection() {
      try {
        const raw = window.localStorage.getItem(SELECTION_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    }

    function writeSelection(notebookId, pageId) {
      try {
        window.localStorage.setItem(SELECTION_KEY, JSON.stringify({ notebookId, pageId }))
      } catch {
        // Selection is a convenience only; storage failures are not actionable.
      }
    }

    function formatWhen(timestamp) {
      if (!Number.isFinite(timestamp)) return ''
      const date = new Date(timestamp)
      const pad = (value) => String(value).padStart(2, '0')
      return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    function imageUrl(image) {
      return IMAGE_BASE + encodeURIComponent(image)
    }

    function imageFileProblem(file) {
      if (!file) return '没有读到图片文件'
      if (!ACCEPTED_IMAGE.test(file.type || '')) return '只支持 PNG、JPEG、WebP 或 GIF 图片'
      if (file.size > MAX_IMAGE_BYTES) return '图片超过 20 MB，请压缩后再粘贴'
      return ''
    }

    async function readJson(response) {
      const text = await response.text()
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    }

    async function uploadImage(file) {
      const response = await fetch(IMAGE_API, {
        method: 'POST',
        headers: { 'content-type': file.type || 'application/octet-stream' },
        body: file,
      })
      const data = await readJson(response)
      if (!response.ok || !data || data.ok !== true || typeof data.image !== 'string') {
        const message = data && data.error && data.error.message ? data.error.message : `图片上传失败（HTTP ${response.status}）`
        throw new Error(message)
      }
      return data.image
    }

    async function persistState(doc) {
      const response = await fetch(STATE_API, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(doc),
      })
      const data = await readJson(response)
      if (!response.ok || !data || data.ok !== true) {
        const message = data && data.error && data.error.message ? data.error.message : `保存失败（HTTP ${response.status}）`
        throw new Error(message)
      }
    }

    function ReviewNotesIcon(props) {
      const size = props && props.size ? props.size : 20
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M6.6 3.5h9.1A2.3 2.3 0 0 1 18 5.8v12.4a2.3 2.3 0 0 1-2.3 2.3H6.6A1.6 1.6 0 0 1 5 18.9V5.1a1.6 1.6 0 0 1 1.6-1.6Z',
          stroke: 'currentColor', strokeWidth: 1.7, strokeLinejoin: 'round',
        }),
        h('path', { d: 'M9.1 3.7v16.7', stroke: 'currentColor', strokeWidth: 1.7 }),
        h('path', {
          d: 'M12.4 8.1h3.2M12.4 11.5h3.2M12.4 14.9h2.2',
          stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round',
        })
      )
    }

    function Empty(props) {
      return h(
        'div',
        { className: 'rn-empty' },
        h('div', { className: 'rn-empty-icon', 'aria-hidden': 'true' }, props.icon || '＋'),
        h('b', null, props.title),
        props.text ? h('p', null, props.text) : null,
        props.action ? h('div', { style: { marginTop: 6 } }, props.action) : null
      )
    }

    function NotebookRow(props) {
      const { notebook, active } = props
      const [editing, setEditing] = useState(false)
      const [value, setValue] = useState(notebook.name)
      const [confirming, setConfirming] = useState(false)
      const inputRef = useRef(null)
      const finishedRef = useRef(false)
      const noteCount = notebook.pages.reduce((sum, page) => sum + page.cards.length, 0)

      useEffect(() => {
        if (editing && inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }, [editing])

      function startEditing() {
        finishedRef.current = false
        setValue(notebook.name)
        setEditing(true)
      }

      function cancelRename() {
        if (finishedRef.current) return
        finishedRef.current = true
        setEditing(false)
        setValue(notebook.name)
      }

      function commitRename() {
        if (finishedRef.current) return
        finishedRef.current = true
        const next = value.trim()
        if (next && next !== notebook.name) props.onRename(notebook.id, next)
        setEditing(false)
        setValue(notebook.name)
      }

      if (editing) {
        return h(
          'div',
          { className: 'rn-row is-active', style: { padding: 6 } },
          h('div', { className: 'rn-create-row', style: { width: '100%' } },
            h('input', {
              ref: inputRef,
              className: 'rn-input',
              value,
              maxLength: MAX_NAME,
              onChange: (event) => setValue(event.target.value),
              onBlur: commitRename,
              onKeyDown: (event) => {
                if (event.key === 'Enter') { event.preventDefault(); commitRename() }
                if (event.key === 'Escape') { event.preventDefault(); cancelRename() }
              },
            }),
            h('button', { type: 'button', className: 'rn-btn rn-btn-sm rn-btn-primary', onClick: commitRename }, '保存')
          )
        )
      }

      return h(
        'div',
        {
          className: 'rn-row' + (active ? ' is-active' : ''),
          role: 'button',
          tabIndex: 0,
          title: notebook.name,
          onClick: () => props.onSelect(notebook.id),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); props.onSelect(notebook.id) }
          },
        },
        h('span', { className: 'rn-row-mark', 'aria-hidden': 'true' }),
        confirming
          ? h('span', { className: 'rn-row-name' }, '删除这个笔记本？')
          : h('span', { className: 'rn-row-name' }, notebook.name),
        h('span', { className: 'rn-row-count' }, noteCount > 0 ? `${noteCount} 条` : `${notebook.pages.length} 页`),
        h('span', { className: 'rn-row-actions' },
          confirming
            ? h(React.Fragment, null,
                h('button', {
                  type: 'button',
                  className: 'rn-icon-btn rn-btn-danger',
                  title: '确认删除',
                  onClick: (event) => { event.stopPropagation(); setConfirming(false); props.onDelete(notebook.id) },
                }, '✓'),
                h('button', {
                  type: 'button',
                  className: 'rn-icon-btn',
                  title: '取消',
                  onClick: (event) => { event.stopPropagation(); setConfirming(false) },
                }, '×')
              )
            : h(React.Fragment, null,
                h('button', {
                  type: 'button',
                  className: 'rn-icon-btn',
                  title: '重命名',
                  'aria-label': '重命名笔记本',
                  onClick: (event) => { event.stopPropagation(); startEditing() },
                }, '✎'),
                h('button', {
                  type: 'button',
                  className: 'rn-icon-btn',
                  title: '删除',
                  'aria-label': '删除笔记本',
                  onClick: (event) => { event.stopPropagation(); setConfirming(true) },
                }, '🗑')
              )
        )
      )
    }

    function NotebookColumn(props) {
      const { notebooks, activeId } = props
      const [adding, setAdding] = useState(notebooks.length === 0)
      const [name, setName] = useState('')
      const inputRef = useRef(null)

      useEffect(() => {
        if (adding && inputRef.current) inputRef.current.focus()
      }, [adding])

      function submit() {
        if (props.onCreate(name) !== false) {
          setName('')
          setAdding(false)
        }
      }

      return h(
        'aside',
        { className: 'rn-col', 'aria-label': '笔记本' },
        h('div', { className: 'rn-col-head' },
          h('span', { className: 'rn-col-title' }, '笔记本'),
          h('div', { className: 'rn-col-actions' },
            h('button', {
              type: 'button',
              className: 'rn-icon-btn',
              title: adding ? '收起新建' : '新建笔记本',
              'aria-label': '新建笔记本',
              onClick: () => setAdding((value) => !value),
            }, adding ? '×' : '＋')
          )
        ),
        adding
          ? h('div', { className: 'rn-create' },
              h('input', {
                ref: inputRef,
                className: 'rn-input',
                placeholder: '科目名称，如「高等数学」',
                value: name,
                maxLength: MAX_NAME,
                onChange: (event) => setName(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') { event.preventDefault(); submit() }
                  if (event.key === 'Escape') { setAdding(false); setName('') }
                },
              }),
              h('div', { className: 'rn-create-row' },
                h('button', { type: 'button', className: 'rn-btn rn-btn-sm rn-btn-primary', style: { flex: 1 }, onClick: submit }, '创建笔记本'),
                h('button', { type: 'button', className: 'rn-btn rn-btn-sm', onClick: () => { setAdding(false); setName('') } }, '取消')
              ),
              h('span', { className: 'rn-muted', style: { fontSize: 10.5 } }, '用科目命名，例如「线性代数」「大学物理」')
            )
          : null,
        notebooks.length === 0 && !adding
          ? h(Empty, { icon: '📓', title: '还没有笔记本', text: '点右上角「＋」用科目名称创建第一个笔记本。' })
          : h('div', { className: 'rn-scroll' },
              notebooks.map((notebook) => h(NotebookRow, {
                key: notebook.id,
                notebook,
                active: notebook.id === activeId,
                onSelect: props.onSelect,
                onRename: props.onRename,
                onDelete: props.onDelete,
              }))
            )
      )
    }

    function PageRow(props) {
      const { page, active } = props
      const [editing, setEditing] = useState(false)
      const [value, setValue] = useState(page.title)
      const [confirming, setConfirming] = useState(false)
      const inputRef = useRef(null)
      const finishedRef = useRef(false)

      useEffect(() => {
        if (editing && inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }, [editing])

      function startEditing() {
        finishedRef.current = false
        setValue(page.title)
        setEditing(true)
      }

      function cancelRename() {
        if (finishedRef.current) return
        finishedRef.current = true
        setEditing(false)
        setValue(page.title)
      }

      function commitRename() {
        if (finishedRef.current) return
        finishedRef.current = true
        const next = value.trim()
        if (next && next !== page.title) props.onRename(page.id, next)
        setEditing(false)
        setValue(page.title)
      }

      if (editing) {
        return h(
          'div',
          { className: 'rn-row is-active', style: { padding: 6 } },
          h('input', {
            ref: inputRef,
            className: 'rn-input',
            value,
            maxLength: MAX_TITLE,
            onChange: (event) => setValue(event.target.value),
            onBlur: commitRename,
            onKeyDown: (event) => {
              if (event.key === 'Enter') { event.preventDefault(); commitRename() }
              if (event.key === 'Escape') { event.preventDefault(); cancelRename() }
            },
          })
        )
      }

      return h(
        'div',
        {
          className: 'rn-row' + (active ? ' is-active' : ''),
          role: 'button',
          tabIndex: 0,
          title: page.title,
          onClick: () => props.onSelect(page.id),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); props.onSelect(page.id) }
          },
        },
        h('span', { className: 'rn-row-mark', 'aria-hidden': 'true' }),
        confirming
          ? h('span', { className: 'rn-row-name' }, '删除这一页？')
          : h('span', { className: 'rn-row-name' }, page.title),
        h('span', { className: 'rn-row-count' }, `${page.cards.length} 条`),
        h('span', { className: 'rn-row-actions' },
          confirming
            ? h(React.Fragment, null,
                h('button', {
                  type: 'button',
                  className: 'rn-icon-btn rn-btn-danger',
                  title: '确认删除',
                  onClick: (event) => { event.stopPropagation(); setConfirming(false); props.onDelete(page.id) },
                }, '✓'),
                h('button', {
                  type: 'button',
                  className: 'rn-icon-btn',
                  title: '取消',
                  onClick: (event) => { event.stopPropagation(); setConfirming(false) },
                }, '×')
              )
            : h(React.Fragment, null,
                h('button', {
                  type: 'button',
                  className: 'rn-icon-btn',
                  title: '重命名',
                  'aria-label': '重命名页',
                  onClick: (event) => { event.stopPropagation(); startEditing() },
                }, '✎'),
                h('button', {
                  type: 'button',
                  className: 'rn-icon-btn',
                  title: '删除',
                  'aria-label': '删除页',
                  onClick: (event) => { event.stopPropagation(); setConfirming(true) },
                }, '🗑')
              )
        )
      )
    }

    function PageColumn(props) {
      const { notebook, activeId } = props
      return h(
        'nav',
        { className: 'rn-col', 'aria-label': '页' },
        h('div', { className: 'rn-col-head' },
          h('span', { className: 'rn-col-title' }, '页'),
          h('div', { className: 'rn-col-actions' },
            h('button', {
              type: 'button',
              className: 'rn-icon-btn',
              title: notebook ? '新建页' : '先选择笔记本',
              'aria-label': '新建页',
              disabled: !notebook,
              onClick: props.onCreate,
            }, '＋')
          )
        ),
        !notebook
          ? h(Empty, { icon: '📚', title: '先选一个笔记本', text: '左侧选好科目后，这里会列出它的每一页。' })
          : notebook.pages.length === 0
            ? h(Empty, {
                icon: '📄',
                title: '这个笔记本还没有页',
                text: '新建一页，然后粘贴截图并写一句话总结。',
                action: h('button', { type: 'button', className: 'rn-btn rn-btn-sm rn-btn-primary', onClick: props.onCreate }, '新建第一页'),
              })
            : h('div', { className: 'rn-scroll' },
                notebook.pages.map((page, index) => h(PageRow, {
                  key: page.id,
                  page,
                  index,
                  active: page.id === activeId,
                  onSelect: props.onSelect,
                  onRename: props.onRename,
                  onDelete: props.onDelete,
                }))
              )
      )
    }

    function NoteCard(props) {
      const { card } = props
      const [editing, setEditing] = useState(false)
      const [value, setValue] = useState(card.summary)
      const [confirming, setConfirming] = useState(false)
      const textareaRef = useRef(null)

      useEffect(() => {
        if (editing && textareaRef.current) textareaRef.current.focus()
      }, [editing])

      function save() {
        if (props.onUpdateSummary(card.id, value) !== false) setEditing(false)
      }

      function startEdit() {
        setValue(card.summary)
        setEditing(true)
      }

      return h(
        'article',
        { className: 'rn-card' },
        h('button', {
          type: 'button',
          className: 'rn-thumb',
          title: '查看大图',
          'aria-label': '查看大图：' + card.summary,
          onClick: () => props.onOpenImage(card),
        },
          h('img', {
            src: imageUrl(card.image),
            alt: card.summary,
            loading: 'lazy',
            width: card.width > 0 ? card.width : undefined,
            height: card.height > 0 ? card.height : undefined,
          })
        ),
        h('div', { className: 'rn-card-body' },
          editing
            ? h('div', { className: 'rn-edit' },
                h('textarea', {
                  ref: textareaRef,
                  className: 'rn-textarea',
                  value,
                  maxLength: MAX_SUMMARY,
                  rows: 3,
                  onChange: (event) => setValue(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Escape') { setEditing(false); setValue(card.summary) }
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); save() }
                  },
                }),
                h('div', { className: 'rn-edit-actions' },
                  h('span', { className: 'rn-muted', style: { marginRight: 'auto', fontSize: 10.5 } }, 'Enter 换行 · Ctrl+Enter 保存'),
                  h('button', { type: 'button', className: 'rn-btn rn-btn-sm', onClick: () => { setEditing(false); setValue(card.summary) } }, '取消'),
                  h('button', { type: 'button', className: 'rn-btn rn-btn-sm rn-btn-primary', onClick: save }, '保存总结')
                )
              )
            : h('div', { className: 'rn-summary-row' },
                h('p', { className: 'rn-summary', title: '双击可以编辑总结', onDoubleClick: startEdit }, card.summary),
                h('button', {
                  type: 'button',
                  className: 'rn-icon-btn rn-summary-edit',
                  title: '编辑总结',
                  'aria-label': '编辑总结',
                  onClick: startEdit,
                }, '✎')
              ),
          h('div', { className: 'rn-card-meta' },
            h('span', null, formatWhen(card.createdAt)),
            card.width && card.height ? h('span', null, `${card.width} × ${card.height}`) : null
          ),
          h('div', { className: 'rn-card-actions' },
            confirming
              ? h(React.Fragment, null,
                  h('button', { type: 'button', className: 'rn-btn rn-btn-sm rn-btn-danger', onClick: () => { setConfirming(false); props.onDelete(card.id) } }, '确认删除'),
                  h('button', { type: 'button', className: 'rn-btn rn-btn-sm', onClick: () => setConfirming(false) }, '取消')
                )
              : h(React.Fragment, null,
                  h('button', { type: 'button', className: 'rn-btn rn-btn-sm rn-btn-ghost', disabled: props.isFirst, onClick: () => props.onMove(card.id, -1) }, '上移'),
                  h('button', { type: 'button', className: 'rn-btn rn-btn-sm rn-btn-ghost', disabled: props.isLast, onClick: () => props.onMove(card.id, 1) }, '下移'),
                  h('button', { type: 'button', className: 'rn-btn rn-btn-sm', onClick: startEdit }, '编辑总结'),
                  h('button', { type: 'button', className: 'rn-btn rn-btn-sm rn-btn-ghost rn-btn-danger', onClick: () => setConfirming(true) }, '删除')
                )
          )
        )
      )
    }

    function PagePanel(props) {
      const { notebook, page, pageIndex, pageCount } = props
      const [dragOver, setDragOver] = useState(false)

      if (!notebook) {
        return h(
          'main',
          { className: 'rn-page' },
          h(Empty, {
            icon: '📓',
            title: '用科目名称建一个笔记本',
            text: '在左侧创建笔记本，比如「数据结构」「大学物理」。每个笔记本可以有很多页。',
          })
        )
      }

      if (!page) {
        return h(
          'main',
          { className: 'rn-page' },
          h(Empty, {
            icon: '📄',
            title: `「${notebook.name}」还没有页`,
            text: '新建一页，然后把截图粘贴进去，写一句话总结。',
            action: h('button', { type: 'button', className: 'rn-btn rn-btn-primary', onClick: props.onCreatePage }, '新建一页'),
          })
        )
      }

      function onDrop(event) {
        event.preventDefault()
        setDragOver(false)
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
        if (file) props.onPickFile(file)
      }

      const updatedAt = page.cards.reduce(
        (latest, card) => Math.max(latest, Number.isFinite(card.createdAt) ? card.createdAt : 0),
        page.createdAt
      )

      return h(
        'main',
        { className: 'rn-page' },
        h('div', { className: 'rn-page-head' },
          h('div', null,
            h('h2', null, page.title),
            h('p', { className: 'rn-page-sub' },
              `${notebook.name} · ${page.cards.length} 条笔记 · 更新于 ${formatWhen(updatedAt)}`
            )
          ),
          h('div', { className: 'rn-page-actions' },
            h('button', {
              type: 'button',
              className: 'rn-btn rn-btn-sm',
              disabled: pageIndex <= 0,
              onClick: props.onPrevPage,
              title: '上一页',
            }, '‹ 上一页'),
            h('button', {
              type: 'button',
              className: 'rn-btn rn-btn-sm',
              disabled: pageIndex >= pageCount - 1,
              onClick: props.onNextPage,
              title: '下一页',
            }, '下一页 ›'),
            h('button', {
              type: 'button',
              className: 'rn-btn rn-btn-sm rn-btn-primary',
              onClick: props.onPickClick,
            }, '粘贴图片')
          )
        ),
        h('div', { className: 'rn-page-scroll' },
          h('div', {
            className: 'rn-drop' + (dragOver ? ' is-over' : ''),
            role: 'button',
            tabIndex: 0,
            onClick: props.onPickClick,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); props.onPickClick() }
            },
            onDragOver: (event) => { event.preventDefault(); setDragOver(true) },
            onDragLeave: (event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false)
            },
            onDrop,
          },
            h('div', { className: 'rn-drop-icon', 'aria-hidden': 'true' }, '＋'),
            h('div', { style: { minWidth: 0 } },
              h('b', null, '把图片粘贴到这一页'),
              h('span', null, '按 Ctrl+V 粘贴截图，或拖拽图片到这里；也可以点击选择文件。')
            ),
            h('span', { className: 'rn-drop-tip' }, 'PNG / JPG / WebP / GIF')
          ),
          page.cards.length === 0
            ? h(Empty, {
                icon: '✍️',
                title: '这一页还是空的',
                text: '粘贴一张截图（比如错题、公式推导、实验图），再写一句话总结它。',
              })
            : h('div', { className: 'rn-cards' },
                page.cards.map((card, index) => h(NoteCard, {
                  key: card.id,
                  card,
                  isFirst: index === 0,
                  isLast: index === page.cards.length - 1,
                  onUpdateSummary: (cardId, summary) => props.onUpdateSummary(page.id, cardId, summary),
                  onDelete: (cardId) => props.onDeleteCard(page.id, cardId),
                  onMove: (cardId, delta) => props.onMoveCard(page.id, cardId, delta),
                  onOpenImage: (target) => props.onOpenImage(target, page.title),
                }))
              )
        )
      )
    }

    function DraftDialog(props) {
      const { draft } = props
      const textareaRef = useRef(null)
      const [value, setValue] = useState(draft.summary)

      useEffect(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        }
      }, [])

      useEffect(() => {
        function onKey(event) {
          if (event.key === 'Escape' && !draft.saving) {
            event.preventDefault()
            props.onCancel()
          }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [draft.saving, props.onCancel])

      function submit() {
        if (draft.saving) return
        props.onSave(value)
      }

      return h(
        'div',
        {
          className: 'rn-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !draft.saving) props.onCancel()
          },
        },
        h('div', { className: 'rn-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': '添加一条复习笔记' },
          h('div', { className: 'rn-dialog-head' },
            h('div', null,
              h('b', null, '添加一条复习笔记'),
              h('p', null, `保存到「${draft.notebookName} / ${draft.pageTitle}」`)
            ),
            h('button', {
              type: 'button',
              className: 'rn-icon-btn',
              style: { marginLeft: 'auto' },
              title: '关闭',
              onClick: () => { if (!draft.saving) props.onCancel() },
            }, '×')
          ),
          h('div', { className: 'rn-dialog-body' },
            h('div', { className: 'rn-preview' },
              h('img', { src: draft.url, alt: '待保存的图片预览' })
            ),
            h('label', { htmlFor: 'rn-draft-summary', style: { fontSize: 12, fontWeight: 600 } }, '一句话总结这张图（可换行）'),
            h('textarea', {
              id: 'rn-draft-summary',
              ref: textareaRef,
              className: 'rn-textarea',
              rows: 3,
              maxLength: MAX_SUMMARY,
              placeholder: '例如：斜面上物块的受力分析——重力、支持力和摩擦力三力平衡。',
              value,
              onChange: (event) => setValue(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit() }
              },
            }),
            h('span', { className: 'rn-counter' }, `${value.length} / ${MAX_SUMMARY} 字`)
          ),
          h('div', { className: 'rn-dialog-foot' },
            h('span', { className: 'rn-grow rn-muted', style: { fontSize: 10.5 } }, 'Ctrl+Enter 快速保存'),
            h('button', { type: 'button', className: 'rn-btn', disabled: draft.saving, onClick: props.onCancel }, '取消'),
            h('button', {
              type: 'button',
              className: 'rn-btn rn-btn-primary',
              disabled: draft.saving || value.trim().length === 0,
              onClick: submit,
            }, draft.saving ? '保存中…' : '保存笔记')
          )
        )
      )
    }

    function Lightbox(props) {
      const { lightbox } = props
      useEffect(() => {
        function onKey(event) {
          if (event.key === 'Escape') props.onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [props.onClose])
      return h(
        'div',
        {
          className: 'rn-lightbox',
          onClick: (event) => { if (event.target === event.currentTarget) props.onClose() },
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': '查看大图',
        },
        h('img', { src: imageUrl(lightbox.card.image), alt: lightbox.card.summary }),
        h('p', null, lightbox.card.summary),
        h('small', null, `${lightbox.pageTitle} · ${formatWhen(lightbox.card.createdAt)} · 点击空白处关闭`)
      )
    }

    function ReviewNotesApp() {
      const [phase, setPhase] = useState('loading')
      const [loadError, setLoadError] = useState('')
      const [doc, setDoc] = useState(() => ({ version: 1, notebooks: [] }))
      const [notebookId, setNotebookId] = useState(null)
      const [pageId, setPageId] = useState(null)
      const [draft, setDraft] = useState(null)
      const [lightbox, setLightbox] = useState(null)
      const [saving, setSaving] = useState(false)
      const [saveError, setSaveError] = useState('')
      const [toast, setToast] = useState(null)

      const docRef = useRef(doc)
      const draftRef = useRef(null)
      const dirtyRef = useRef(false)
      const saveTimerRef = useRef(null)
      const saveSeqRef = useRef(0)
      const toastTimerRef = useRef(null)
      const fileInputRef = useRef(null)
      const selectionRef = useRef({ notebookId: null, pageId: null })
      const openDraftRef = useRef(null)

      const notebook = pickNotebook(doc, notebookId)
      const page = pickPage(notebook, pageId)
      const pages = notebook ? notebook.pages : []
      const pageIndex = pages.findIndex((candidate) => candidate.id === pageId)

      selectionRef.current = { notebookId, pageId }
      draftRef.current = draft

      function showToast(kind, text) {
        setToast({ kind, text })
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setToast(null), kind === 'error' ? 5200 : 2600)
      }

      const persist = useCallback(async (snapshot) => {
        const seq = ++saveSeqRef.current
        setSaving(true)
        try {
          await persistState(snapshot)
          if (seq === saveSeqRef.current) {
            dirtyRef.current = false
            setSaveError('')
            setSaving(false)
          }
        } catch (error) {
          if (seq === saveSeqRef.current) {
            setSaving(false)
            setSaveError(error instanceof Error ? error.message : String(error))
          }
        }
      }, [])

      function commit(next) {
        docRef.current = next
        setDoc(next)
        dirtyRef.current = true
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          saveTimerRef.current = null
          void persist(docRef.current)
        }, 220)
      }

      const load = useCallback(async () => {
        setPhase('loading')
        setLoadError('')
        try {
          const response = await fetch(STATE_API, { headers: { accept: 'application/json' } })
          const data = await readJson(response)
          if (!response.ok || !data || data.ok !== true) {
            const message = data && data.error && data.error.message ? data.error.message : `读取失败（HTTP ${response.status}）`
            throw new Error(message)
          }
          const nextDoc = normalizeClientDoc(data.state)
          const saved = readSelection()
          const nextNotebook = pickNotebook(nextDoc, saved.notebookId) || nextDoc.notebooks[0] || null
          const nextPage = nextNotebook ? (pickPage(nextNotebook, saved.pageId) || nextNotebook.pages[0] || null) : null
          docRef.current = nextDoc
          setDoc(nextDoc)
          setNotebookId(nextNotebook ? nextNotebook.id : null)
          setPageId(nextPage ? nextPage.id : null)
          setSaveError('')
          dirtyRef.current = false
          setPhase('ready')
        } catch (error) {
          setLoadError(error instanceof Error ? error.message : String(error))
          setPhase('error')
        }
      }, [])

      useEffect(() => { void load() }, [load])

      useEffect(() => {
        if (phase !== 'ready') return
        writeSelection(notebookId, pageId)
      }, [phase, notebookId, pageId])

      useEffect(() => {
        if (phase !== 'ready') return
        if (notebookId && !pickNotebook(doc, notebookId)) {
          const fallback = doc.notebooks[0] || null
          setNotebookId(fallback ? fallback.id : null)
          setPageId(fallback && fallback.pages[0] ? fallback.pages[0].id : null)
          return
        }
        if (notebookId && pageId && !pickPage(pickNotebook(doc, notebookId), pageId)) {
          const current = pickNotebook(doc, notebookId)
          setPageId(current && current.pages[0] ? current.pages[0].id : null)
        }
      }, [doc, notebookId, pageId, phase])

      useEffect(() => {
        function onPaste(event) {
          if (!event.clipboardData) return
          const items = event.clipboardData.items
          for (let index = 0; index < items.length; index += 1) {
            const item = items[index]
            if (item.kind === 'file' && String(item.type).indexOf('image/') === 0) {
              const file = item.getAsFile()
              if (file) {
                event.preventDefault()
                if (openDraftRef.current) openDraftRef.current(file)
                return
              }
            }
          }
        }
        document.addEventListener('paste', onPaste)
        return () => document.removeEventListener('paste', onPaste)
      }, [])

      useEffect(() => {
        openDraftRef.current = openDraft
      })

      useEffect(() => () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        const opened = draftRef.current
        if (opened && opened.url) URL.revokeObjectURL(opened.url)
        if (dirtyRef.current) {
          try {
            fetch(STATE_API, {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(docRef.current),
              keepalive: true,
            }).catch(() => {})
          } catch {
            // Best-effort flush on panel switch; the debounced save covers normal paths.
          }
        }
      }, [])

      function openDraft(file) {
        if (phase !== 'ready') {
          showToast('error', '笔记还在加载，请稍候再粘贴')
          return
        }
        if (draftRef.current) {
          showToast('error', '先保存或取消当前这张图片')
          return
        }
        const problem = imageFileProblem(file)
        if (problem) {
          showToast('error', problem)
          return
        }
        const targetNotebook = pickNotebook(docRef.current, selectionRef.current.notebookId)
        const targetPage = pickPage(targetNotebook, selectionRef.current.pageId)
        if (!targetNotebook || !targetPage) {
          showToast('error', '先选择或新建一页，再粘贴图片')
          return
        }
        const url = URL.createObjectURL(file)
        const nextDraft = {
          file,
          url,
          summary: '',
          saving: false,
          width: 0,
          height: 0,
          notebookId: targetNotebook.id,
          pageId: targetPage.id,
          notebookName: targetNotebook.name,
          pageTitle: targetPage.title,
        }
        setDraft(nextDraft)
        const probe = new Image()
        probe.onload = () => {
          setDraft((current) => (current && current.url === url
            ? { ...current, width: probe.naturalWidth, height: probe.naturalHeight }
            : current))
        }
        probe.src = url
      }

      function closeDraft() {
        const opened = draftRef.current
        if (opened && opened.url) URL.revokeObjectURL(opened.url)
        setDraft(null)
      }

      async function saveDraft(summaryValue) {
        const current = draftRef.current
        if (!current || current.saving) return
        const summary = String(summaryValue || '').trim()
        if (!summary) {
          showToast('error', '写一句话总结后再保存')
          return
        }
        setDraft((previous) => (previous ? { ...previous, saving: true } : previous))
        try {
          const image = await uploadImage(current.file)
          const next = cloneDoc(docRef.current)
          const found = findPageEverywhere(next, current.pageId)
          if (!found) throw new Error('目标页已经不存在，请重新选择一页')
          found.page.cards.push({
            id: newId(),
            summary,
            image,
            width: current.width || 0,
            height: current.height || 0,
            createdAt: now(),
          })
          commit(next)
          closeDraft()
          showToast('ok', '已加一条复习笔记')
        } catch (error) {
          setDraft((previous) => (previous ? { ...previous, saving: false } : previous))
          showToast('error', error instanceof Error ? error.message : String(error))
        }
      }

      function handleCreateNotebook(rawName) {
        const name = String(rawName || '').trim()
        if (!name) { showToast('error', '先输入科目名称'); return false }
        if (name.length > MAX_NAME) { showToast('error', `科目名称最多 ${MAX_NAME} 个字`); return false }
        if (docRef.current.notebooks.some((candidate) => candidate.name.toLowerCase() === name.toLowerCase())) {
          showToast('error', '已经有同名笔记本了')
          return false
        }
        const next = cloneDoc(docRef.current)
        const firstPage = { id: newId(), title: '第 1 页', createdAt: now(), cards: [] }
        const created = { id: newId(), name, createdAt: now(), pages: [firstPage] }
        next.notebooks = [created, ...next.notebooks]
        commit(next)
        setNotebookId(created.id)
        setPageId(firstPage.id)
        showToast('ok', `已创建「${name}」`)
        return true
      }

      function handleRenameNotebook(id, rawName) {
        const name = String(rawName || '').trim()
        if (!name) { showToast('error', '名称不能为空'); return false }
        if (name.length > MAX_NAME) { showToast('error', `名称最多 ${MAX_NAME} 个字`); return false }
        if (docRef.current.notebooks.some((candidate) => candidate.id !== id && candidate.name.toLowerCase() === name.toLowerCase())) {
          showToast('error', '已经有同名笔记本了')
          return false
        }
        const next = cloneDoc(docRef.current)
        const target = pickNotebook(next, id)
        if (!target) return false
        target.name = name
        commit(next)
        return true
      }

      function handleDeleteNotebook(id) {
        const next = cloneDoc(docRef.current)
        const index = next.notebooks.findIndex((candidate) => candidate.id === id)
        if (index < 0) return
        next.notebooks.splice(index, 1)
        commit(next)
        if (selectionRef.current.notebookId === id) {
          const fallback = next.notebooks[Math.min(index, next.notebooks.length - 1)] || null
          setNotebookId(fallback ? fallback.id : null)
          setPageId(fallback && fallback.pages[0] ? fallback.pages[0].id : null)
        }
        showToast('ok', '笔记本已删除')
      }

      function handleCreatePage() {
        const id = selectionRef.current.notebookId
        if (!id) { showToast('error', '先选择一个笔记本'); return }
        const next = cloneDoc(docRef.current)
        const target = pickNotebook(next, id)
        if (!target) return
        const created = { id: newId(), title: `第 ${target.pages.length + 1} 页`, createdAt: now(), cards: [] }
        target.pages.push(created)
        commit(next)
        setPageId(created.id)
      }

      function handleRenamePage(id, rawTitle) {
        const title = String(rawTitle || '').trim()
        if (!title) { showToast('error', '页标题不能为空'); return false }
        if (title.length > MAX_TITLE) { showToast('error', `页标题最多 ${MAX_TITLE} 个字`); return false }
        const next = cloneDoc(docRef.current)
        const found = findPageEverywhere(next, id)
        if (!found) return false
        found.page.title = title
        commit(next)
        return true
      }

      function handleDeletePage(id) {
        const next = cloneDoc(docRef.current)
        const found = findPageEverywhere(next, id)
        if (!found) return
        const index = found.notebook.pages.findIndex((candidate) => candidate.id === id)
        found.notebook.pages.splice(index, 1)
        commit(next)
        if (selectionRef.current.pageId === id) {
          const fallback = found.notebook.pages[Math.min(index, found.notebook.pages.length - 1)] || null
          setPageId(fallback ? fallback.id : null)
        }
        showToast('ok', '页已删除')
      }

      function handleUpdateSummary(targetPageId, cardId, rawSummary) {
        const summary = String(rawSummary || '').trim()
        if (!summary) { showToast('error', '总结不能为空'); return false }
        if (summary.length > MAX_SUMMARY) { showToast('error', `总结最多 ${MAX_SUMMARY} 个字`); return false }
        const next = cloneDoc(docRef.current)
        const found = findPageEverywhere(next, targetPageId)
        if (!found) return false
        const card = found.page.cards.find((candidate) => candidate.id === cardId)
        if (!card) return false
        card.summary = summary
        commit(next)
        return true
      }

      function handleDeleteCard(targetPageId, cardId) {
        const next = cloneDoc(docRef.current)
        const found = findPageEverywhere(next, targetPageId)
        if (!found) return
        const index = found.page.cards.findIndex((candidate) => candidate.id === cardId)
        if (index < 0) return
        found.page.cards.splice(index, 1)
        commit(next)
        showToast('ok', '这条笔记已删除')
      }

      function handleMoveCard(targetPageId, cardId, delta) {
        const next = cloneDoc(docRef.current)
        const found = findPageEverywhere(next, targetPageId)
        if (!found) return
        const index = found.page.cards.findIndex((candidate) => candidate.id === cardId)
        const target = index + delta
        if (index < 0 || target < 0 || target >= found.page.cards.length) return
        const cards = found.page.cards
        const moved = cards[index]
        cards[index] = cards[target]
        cards[target] = moved
        commit(next)
      }

      function handleFilePick(event) {
        const file = event.target.files && event.target.files[0]
        event.target.value = ''
        if (file) openDraft(file)
      }

      const totalPages = useMemo(() => countPages(doc), [doc])
      const totalNotes = useMemo(() => countNotes(doc), [doc])

      if (phase === 'loading') {
        return h('div', { className: 'rn-root' },
          h(Empty, { icon: '⏳', title: '正在加载复习笔记…' })
        )
      }

      if (phase === 'error') {
        return h('div', { className: 'rn-root' },
          h(Empty, {
            icon: '⚠️',
            title: '复习笔记加载失败',
            text: loadError,
            action: h('button', { type: 'button', className: 'rn-btn rn-btn-primary', onClick: () => { void load() } }, '重新加载'),
          })
        )
      }

      return h(
        'div',
        { className: 'rn-root' },
        h('header', { className: 'rn-top' },
          h('div', { className: 'rn-title' },
            h('h1', null, '复习笔记'),
            h('p', null, '按科目建笔记本，一页一页整理：粘贴图片 + 一句话总结')
          ),
          h('div', { className: 'rn-top-stats' },
            h('span', null, h('b', null, doc.notebooks.length), '笔记本'),
            h('span', null, h('b', null, totalPages), '页'),
            h('span', null, h('b', null, totalNotes), '条笔记'),
            saving ? h('span', { className: 'rn-saving' }, '保存中…') : null
          )
        ),
        saveError
          ? h('div', { className: 'rn-savebar' },
              h('span', null, `保存失败：${saveError}`),
              h('button', {
                type: 'button',
                className: 'rn-btn rn-btn-sm',
                onClick: () => { setSaveError(''); void persist(docRef.current) },
              }, '重试')
            )
          : null,
        h('div', { className: 'rn-body' },
          h(NotebookColumn, {
            notebooks: doc.notebooks,
            activeId: notebookId,
            onSelect: (id) => {
              const target = pickNotebook(docRef.current, id)
              setNotebookId(id)
              setPageId(target && target.pages[0] ? target.pages[0].id : null)
            },
            onCreate: handleCreateNotebook,
            onRename: handleRenameNotebook,
            onDelete: handleDeleteNotebook,
          }),
          h(PageColumn, {
            notebook,
            activeId: pageId,
            onSelect: setPageId,
            onCreate: handleCreatePage,
            onRename: handleRenamePage,
            onDelete: handleDeletePage,
          }),
          h(PagePanel, {
            notebook,
            page,
            pageIndex,
            pageCount: pages.length,
            onPrevPage: () => { if (pageIndex > 0) setPageId(pages[pageIndex - 1].id) },
            onNextPage: () => { if (pageIndex >= 0 && pageIndex < pages.length - 1) setPageId(pages[pageIndex + 1].id) },
            onPickClick: () => { if (fileInputRef.current) fileInputRef.current.click() },
            onPickFile: openDraft,
            onCreatePage: handleCreatePage,
            onUpdateSummary: handleUpdateSummary,
            onDeleteCard: handleDeleteCard,
            onMoveCard: handleMoveCard,
            onOpenImage: (card, pageTitle) => setLightbox({ card, pageTitle }),
          })
        ),
        h('input', {
          ref: fileInputRef,
          type: 'file',
          accept: 'image/png,image/jpeg,image/webp,image/gif',
          style: { display: 'none' },
          onChange: handleFilePick,
        }),
        draft ? h(DraftDialog, {
          draft,
          onCancel: closeDraft,
          onSave: (summary) => { void saveDraft(summary) },
        }) : null,
        lightbox ? h(Lightbox, { lightbox, onClose: () => setLightbox(null) }) : null,
        toast
          ? h('div', { className: 'rn-toast' + (toast.kind === 'error' ? ' is-error' : ''), role: 'status' }, toast.text)
          : null
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const removeStyles = installStyles()
        ctx.effect(() => removeStyles)
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'review-notes',
        }, ReviewNotesApp))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'review-notes',
          order: 15,
          label: '复习笔记',
        }, ReviewNotesIcon))
      },
    }
  },
})
