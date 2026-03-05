import { defineTransformer } from '@nuxt/content'
import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
// @ts-ignore — minimark is a transitive dep of @nuxt/content
import { fromHast } from 'minimark/hast'

/**
 * Convert standard HAST node (tagName/properties) to MDC-style HAST (tag/props)
 * which is what minimark's fromHast expects.
 */
function convertHastToMdc(node: any): any {
  if (node.type === 'text') {
    return { type: 'text', value: node.value }
  }
  if (node.type === 'comment') {
    return { type: 'comment', value: node.value }
  }
  if (node.type === 'element') {
    return {
      type: 'element',
      tag: node.tagName,
      props: node.properties || {},
      children: (node.children || []).map(convertHastToMdc),
    }
  }
  if (node.type === 'root') {
    return {
      type: 'root',
      children: (node.children || []).map(convertHastToMdc),
    }
  }
  return node
}

export default defineTransformer({
  name: 'asciidoc',
  extensions: ['.ad', '.asc', '.adoc', '.asciidoc'],
  parse: async (file:any) => {
    const asciidoctor = (await import('asciidoctor')).default()
    const doc = asciidoctor.load(file.body, { safe: 'safe', attributes: { showtitle: false } })

    const title = doc.getDocumentTitle() as string | undefined
    const description = (doc.getAttribute('description') as string) || undefined

    // Convert AsciiDoc to HTML
    const html = doc.convert() as string

    // Parse HTML into standard HAST
    const standardHast = unified()
      .use(rehypeParse, { fragment: true })
      .parse(html)

    // Convert standard HAST to MDC-style HAST, then to minimark format
    const mdcHast = convertHastToMdc(standardHast)
    const body = fromHast(mdcHast)

    return {
      id: file.id,
      body,
      title,
      description,
    }
  },
})
