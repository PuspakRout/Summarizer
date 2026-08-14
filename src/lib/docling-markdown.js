const SKIP_TAGS = new Set(['page_header', 'page_footer']);

const HEADING_TAGS = {
  title: 1,
  section_header_level_0: 1,
  section_header_level_1: 2,
  section_header_level_2: 3,
  section_header_level_3: 4,
  section_header_level_4: 5,
  section_header_level_5: 6,
};

const TABLE_TAG_CONFIG = {
  '<ched>': { header: true },
  '<rhed>': { header: true },
  '<srow>': { header: true },
  '<fcel>': { header: false },
  '<ecel>': { header: false },
  '<ucel>': { header: false },
  '<lcel>': { header: false },
  '<xcel>': { header: false },
};

const TABLE_TAG_REGEX = new RegExp(`(${Object.keys(TABLE_TAG_CONFIG).join('|')})`);

class DoclingMarkdownConverter {
  constructor() {
    this.selfClosingTagMap = {
      checkbox_selected: '[x] ',
      checkbox_unselected: '[ ] ',
      page_break: '\n\n---\n\n',
    };
    const selfClosingNames = Object.keys(this.selfClosingTagMap).join('|');
    this.combinedTagRegex = new RegExp(
      `(<([a-z_0-9]+)>(.*?)<\\/\\2>)|(<(${selfClosingNames})>)`,
      's',
    );
  }

  convert(docling) {
    let text = ` ${docling} `;
    text = text.replace(/<loc_[0-9]+>/g, '');
    return this.processTags(text).replace(/\n{3,}/g, '\n\n').trim();
  }

  processTags(text) {
    let remainingText = text;
    const parts = [];

    while (remainingText.length > 0) {
      const match = remainingText.match(this.combinedTagRegex);
      if (match && typeof match.index === 'number') {
        const textBefore = remainingText.substring(0, match.index).trim();
        if (textBefore) {
          parts.push(textBefore);
        }

        const fullMatch = match[0];
        const pairedTagName = match[2];
        const pairedContent = match[3];
        const selfClosingTagName = match[5];

        if (pairedTagName !== undefined) {
          const converted = this.convertSingleTag(pairedTagName, pairedContent);
          if (converted) {
            parts.push(converted);
          }
        } else if (selfClosingTagName !== undefined) {
          parts.push(this.selfClosingTagMap[selfClosingTagName] || '');
        }

        remainingText = remainingText.substring(match.index + fullMatch.length);
      } else {
        const tail = remainingText.trim();
        if (tail) {
          parts.push(tail);
        }
        break;
      }
    }

    return parts.join('\n\n');
  }

  convertSingleTag(tagName, content) {
    if (SKIP_TAGS.has(tagName)) {
      return '';
    }

    if (tagName === 'list_item') {
      content = content.trim().replace(/^[·-]\s*/g, '');
    }

    switch (tagName) {
      case 'code':
        return this.convertBlockCode(content);
      case 'otsl':
      case 'table':
        return this.convertTable(content);
      case 'picture':
      case 'chart':
        return this.convertPictureOrChart(tagName, content);
      case 'inline':
        return this.convertInlineContent(content);
      case 'formula':
        return this.convertFormula(content);
      case 'doctag':
      case 'document':
      case 'ordered_list':
      case 'unordered_list':
      case 'form':
      case 'key_value_region':
      case 'document_index':
        return this.processTags(content);
      case 'list_item':
        return `- ${this.processTags(content)}`;
      case 'caption':
      case 'footnote':
      case 'text':
      case 'paragraph':
        return this.processTags(content);
      case 'reference':
        return this.processTags(content);
      case 'smiles':
        return this.processTags(content);
      default: {
        const headingLevel = HEADING_TAGS[tagName];
        if (headingLevel) {
          const headingText = this.processTags(content).replace(/\n+/g, ' ').trim();
          return `${'#'.repeat(headingLevel)} ${headingText}`;
        }

        if (tagName.startsWith('section_header_level_')) {
          const level = parseInt(tagName.at(-1), 10) + 1;
          const headingText = this.processTags(content).replace(/\n+/g, ' ').trim();
          return `${'#'.repeat(level)} ${headingText}`;
        }

        return this.processTags(content);
      }
    }
  }

  convertInlineContent(content) {
    const inlineTagRegex = /<(code|formula|text|smiles)>(.*?)<\/\1>/s;
    let remainingText = content;
    let result = '';

    while (remainingText.length > 0) {
      const match = remainingText.match(inlineTagRegex);
      if (match && typeof match.index === 'number') {
        result += remainingText.substring(0, match.index);
        const [fullMatch, tagName, innerContent] = match;

        switch (tagName) {
          case 'code':
            result += `\`${innerContent.trim()}\``;
            break;
          case 'formula':
            result += `$${innerContent.trim()}$`;
            break;
          case 'smiles':
          case 'text':
            result += innerContent.trim();
            break;
        }

        remainingText = remainingText.substring(match.index + fullMatch.length);
      } else {
        result += remainingText;
        break;
      }
    }

    return result.trim();
  }

  convertFormula(content) {
    const formula = this.processTags(content).replace(/\n+/g, ' ').trim();
    return formula ? `\n\n$$\n${formula}\n$$\n\n` : '';
  }

  convertBlockCode(content) {
    const langRegex = /<_(.*?)_>/;
    const langMatch = content.match(langRegex);
    let language = '';
    let codeContent = content;

    if (langMatch?.[1]) {
      language = langMatch[1].trim();
      codeContent = content.replace(langRegex, '').trim();
    }

    return `\n\n\`\`\`${language}\n${codeContent.trim()}\n\`\`\`\n\n`;
  }

  convertTable(content) {
    const cellGrid = this.buildCellGrid(content);
    if (!cellGrid.length) {
      return '';
    }

    const rows = cellGrid.map((row) =>
      row.map((cell) => this.escapeTableCell(this.processTags(cell.content))),
    );

    if (!rows.length || !rows[0]?.length) {
      return '';
    }

    const headerRow = rows[0];
    const separator = headerRow.map(() => '---');
    const bodyRows = rows.slice(1);

    const lines = [
      `| ${headerRow.join(' | ')} |`,
      `| ${separator.join(' | ')} |`,
      ...bodyRows.map((row) => `| ${row.join(' | ')} |`),
    ];

    return `\n\n${lines.join('\n')}\n\n`;
  }

  buildCellGrid(content) {
    const rows = content
      .trim()
      .split(/<nl>/)
      .filter((row) => row.length > 0);
    const cellGrid = [];

    rows.forEach((rowStr, rowIndex) => {
      const parts = rowStr.split(TABLE_TAG_REGEX);
      const currentRow = [];
      let gridColIndex = 0;

      for (let i = 1; i < parts.length; i += 2) {
        const tag = parts[i];
        const cellContent = parts[i + 1] || '';

        switch (tag) {
          case '<lcel>':
            if (currentRow.length > 0) {
              currentRow[currentRow.length - 1].colspan += 1;
            }
            break;
          case '<ucel>':
            if (rowIndex > 0 && cellGrid[rowIndex - 1]?.[gridColIndex]) {
              cellGrid[rowIndex - 1][gridColIndex].rowspan += 1;
            }
            gridColIndex += 1;
            break;
          case '<xcel>':
            if (currentRow.length > 0) {
              currentRow[currentRow.length - 1].colspan += 1;
            }
            break;
          default:
            if (TABLE_TAG_CONFIG[tag]) {
              currentRow.push({
                content: cellContent,
                tag,
                colspan: 1,
                rowspan: 1,
              });
              gridColIndex += 1;
            }
            break;
        }
      }

      cellGrid.push(currentRow);
    });

    return cellGrid;
  }

  convertPictureOrChart(tag, content) {
    if (/<(fcel|ched|rhed)>/.test(content)) {
      const cleanedContent = content.replace(/<[a-z_]+>/g, (match) => {
        if (
          match.startsWith('<fcel') ||
          match.startsWith('<ched') ||
          match.startsWith('<rhed') ||
          match.startsWith('<nl')
        ) {
          return match;
        }
        return '';
      });
      return this.convertTable(cleanedContent);
    }

    const captionRegex = /<caption>(.*?)<\/caption>/s;
    const captionMatch = content.match(captionRegex);
    if (captionMatch?.[1]) {
      const caption = this.processTags(captionMatch[1]).replace(/\n+/g, ' ').trim();
      return caption ? `*${caption}*` : '';
    }

    return tag === 'chart' ? '*[Chart]*' : '*[Image]*';
  }

  escapeTableCell(text) {
    return text.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
  }
}

export function doclingToMarkdown(docling) {
  const converter = new DoclingMarkdownConverter();
  return converter.convert(docling);
}

export function normalizeDoclingOutput(text) {
  return text.replace(/<\|end_of_text\|>$/, '').trim();
}
