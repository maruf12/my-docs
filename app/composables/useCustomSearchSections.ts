import type { PageCollections } from '@nuxt/content'
import { toHast } from 'minimark/hast'

const HEADING = /^h([1-6])$/
const headingLevel = (tag: string) => Number(tag.match(HEADING)?.[1] ?? 0)

interface SearchSection {
  id: string
  title: string
  titles: string[]
  content: string
  level: number
  [key: string]: unknown
}

interface SearchSectionsOptions {
  ignoredTags?: string[]
  extraFields?: string[]
  minHeading?: string
  maxHeading?: string
}

function extractTextFromAst(node: any, ignoredTags: string[] = []): string {
  let text = ''
  if (node.type === 'text') {
    text += node.value || ''
  }
  if (ignoredTags.includes(node.tag ?? '')) {
    return ''
  }
  if (node.children?.length) {
    text += node.children
      .map((child: any) => extractTextFromAst(child, ignoredTags))
      .filter(Boolean)
      .join('')
  }
  return text
}

function splitPageIntoSections(
  page: any,
  { ignoredTags, extraFields, minLevel, maxLevel }: {
    ignoredTags: string[]
    extraFields: string[]
    minLevel: number
    maxLevel: number
  },
): SearchSection[] {
  const body = !page.body || page.body?.type === 'root'
    ? page.body
    : toHast(page.body)

  const path = page.path ?? ''

  const extraFieldsData: Record<string, unknown> = {}
  for (const field of extraFields) {
    if (page[field] !== undefined) {
      extraFieldsData[field] = page[field]
    }
  }

  const sections: SearchSection[] = [{
    ...extraFieldsData,
    id: path,
    title: page.title || '',
    titles: [],
    content: (page.description || '').trim(),
    level: 1,
  }]

  if (!body?.children) {
    return sections
  }

  let section = 1
  let previousHeadingLevel = 0
  const titles: string[] = [page.title ?? '']

  for (const item of body.children) {
    const tag = item.tag || ''
    const level = headingLevel(tag)

    if (level >= minLevel && level <= maxLevel) {
      const title = extractTextFromAst(item).trim()
      if (level === 1) {
        titles.splice(0, titles.length)
      }
      else if (level < previousHeadingLevel) {
        titles.splice(level - 1, titles.length - 1)
      }
      else if (level === previousHeadingLevel) {
        titles.pop()
      }

      sections.push({
        ...extraFieldsData,
        id: `${path}#${item.props?.id}`,
        title,
        titles: [...titles],
        content: '',
        level,
      })
      titles.push(title)
      previousHeadingLevel = level
      section += 1
    }
    else {
      const content = extractTextFromAst(item, ignoredTags).trim()
      if (section === 1 && sections[section - 1]?.content === content) {
        continue
      }
      sections[section - 1].content = `${sections[section - 1].content} ${content}`.trim()
    }
  }

  return sections
}

/**
 * Custom replacement for `queryCollectionSearchSections` that
 * removes the hardcoded `.where("extension", "=", "md")` filter,
 * allowing `.adoc` (and other custom format) pages to appear in search.
 */
export function useCustomSearchSections(
  collection: keyof PageCollections,
  opts?: SearchSectionsOptions,
) {
  const { ignoredTags = [], extraFields = [], minHeading = 'h1', maxHeading = 'h6' } = opts || {}
  const minLevel = headingLevel(minHeading)
  const maxLevel = headingLevel(maxHeading)

  return queryCollection(collection)
    .select('path', 'body', 'description', 'title', ...extraFields)
    .all()
    .then((documents: any[]) =>
      documents.flatMap(doc =>
        splitPageIntoSections(doc, { ignoredTags, extraFields, minLevel, maxLevel }),
      ),
    )
}
