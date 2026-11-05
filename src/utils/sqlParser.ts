import type { Node, Edge } from '@xyflow/react';
import type { TableData, Column } from '../types/schema';
import { computeDagreLayout } from './autoLayout';

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

const NODE_WIDTH = 320;
const H_GAP = 90;
const V_GAP = 60;

interface ParsedForeignKey {
  sourceTable: string;
  sourceCol: string;
  targetTable: string;
  targetCol: string;
}

export function parseSqlDdl(rawSql: string): { nodes: Node<TableData>[]; edges: Edge[] } {
  const nodes: Node<TableData>[] = [];
  const foreignKeys: ParsedForeignKey[] = [];

  // 1. Bersihkan komentar (/* ... */ dan -- ...)
  let cleanSql = rawSql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .trim();

  // 2. Bersihkan query non-DDL (INSERT INTO ..., CREATE EXTENSION ..., DROP TABLE ...)
  cleanSql = cleanSql.replace(/INSERT\s+INTO\s+[\s\S]*?;/gi, '');
  cleanSql = cleanSql.replace(/CREATE\s+EXTENSION\s+[\s\S]*?;/gi, '');
  cleanSql = cleanSql.replace(/DROP\s+TABLE\s+[\s\S]*?;/gi, '');

  // 3. Ekstraksi tabel dengan menghitung pasangan kurung secara seimbang (Balanced Parentheses)
  // Ini mencegah bug di mana DEFAULT gen_random_uuid() menutup kurung tabel lebih awal
  const tableStartRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"\[]?(\w+)[`"\]]?\.)?[`"\[]?(\w+)[`"\]]?\s*\(/gi;

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = tableStartRegex.exec(cleanSql)) !== null) {
    const tableName = match[2];
    const startIndex = tableStartRegex.lastIndex; // Tepat setelah karakter '(' pembuka

    let depth = 1;
    let endIndex = startIndex;

    while (endIndex < cleanSql.length && depth > 0) {
      const char = cleanSql[endIndex];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      endIndex++;
    }

    // Isi badan tabel yang utuh (semua baris kolom & constraints)
    const body = cleanSql.substring(startIndex, endIndex - 1);
    tableStartRegex.lastIndex = endIndex;

    const lines = splitStatements(body);
    const columns: Column[] = [];
    const tablePKs: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Table-level PRIMARY KEY: PRIMARY KEY (id)
      const pkMatch = line.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const pks = pkMatch[1].split(',').map((c) => c.trim().replace(/[`"\[\]]/g, ''));
        tablePKs.push(...pks);
        continue;
      }

      // Table-level FOREIGN KEY: FOREIGN KEY (col) REFERENCES ref_table(ref_col)
      const fkMatch = line.match(
        /(?:CONSTRAINT\s+[`"\[]?\w+[`"\]]?\s+)?FOREIGN\s+KEY\s*\([`"\[]?(\w+)[`"\]]?\)\s+REFERENCES\s+[`"\[]?(\w+)[`"\]]?\s*\([`"\[]?(\w+)[`"\]]?\)/i
      );
      if (fkMatch) {
        foreignKeys.push({
          targetTable: tableName,
          targetCol: fkMatch[1],
          sourceTable: fkMatch[2],
          sourceCol: fkMatch[3],
        });
        continue;
      }

      // Abaikan standalone constraints non-FK seperti UNIQUE (a, b), CHECK (...)
      if (/^(CONSTRAINT|CHECK|UNIQUE\s*\(|INDEX|KEY)\b/i.test(line) && !/FOREIGN\s+KEY/i.test(line)) {
        continue;
      }

      // Kolom: [nama_kolom] [tipe_data] [modifiers...]
      // Mendukung tipe seperti VARCHAR(150), DECIMAL(10,2), TIMESTAMPTZ, UUID, dsb.
      const colRegex = /^[`"\[]?(\w+)[`"\]]?\s+([a-zA-Z0-9_]+(?:\s*\([^)]*\))?)([\s\S]*)$/;
      const colMatch = line.match(colRegex);

      if (colMatch) {
        const colName = colMatch[1];
        if (/^(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|CHECK|KEY|INDEX)$/i.test(colName)) {
          continue;
        }

        const colType = colMatch[2].toLowerCase().replace(/\s+/g, '');
        const rest = colMatch[3].toUpperCase();

        const isInlinePK = rest.includes('PRIMARY KEY');
        const isNotNull = rest.includes('NOT NULL') || isInlinePK;
        const isUnique = rest.includes('UNIQUE') && !isInlinePK;

        // Inline REFERENCES: col UUID REFERENCES ref_table(ref_col)
        const inlineFk = colMatch[3].match(/REFERENCES\s+[`"\[]?(\w+)[`"\]]?\s*\([`"\[]?(\w+)[`"\]]?\)/i);
        if (inlineFk) {
          foreignKeys.push({
            targetTable: tableName,
            targetCol: colName,
            sourceTable: inlineFk[1],
            sourceCol: inlineFk[2],
          });
        }

        columns.push({
          id: `c_${tableName}_${colName}`,
          name: colName,
          type: colType,
          isPrimaryKey: isInlinePK,
          isNullable: !isNotNull,
          isUnique,
        });
      }
    }

    // Set kolom yang terdaftar di PRIMARY KEY tabel
    for (const col of columns) {
      if (tablePKs.includes(col.name)) {
        col.isPrimaryKey = true;
        col.isNullable = false;
      }
    }

    nodes.push({
      id: tableName,
      type: 'tableNode',
      position: { x: 0, y: 0 },
      data: {
        id: tableName,
        name: tableName,
        color: COLORS[index % COLORS.length],
        columns,
      },
    });

    index++;
  }

  // Bangun relasi edges (foreign keys)
  const edges: Edge[] = [];
  for (const fk of foreignKeys) {
    const srcNode = nodes.find((n) => n.data.name.toLowerCase() === fk.sourceTable.toLowerCase());
    const tgtNode = nodes.find((n) => n.data.name.toLowerCase() === fk.targetTable.toLowerCase());

    if (srcNode && tgtNode) {
      const srcCol = srcNode.data.columns.find((c) => c.name.toLowerCase() === fk.sourceCol.toLowerCase());
      const tgtCol = tgtNode.data.columns.find((c) => c.name.toLowerCase() === fk.targetCol.toLowerCase());

      if (srcCol && tgtCol) {
        edges.push({
          id: `e_${srcNode.id}_${tgtNode.id}_${tgtCol.name}_${Math.random().toString(36).substring(2, 6)}`,
          source: srcNode.id,
          sourceHandle: `${srcCol.id}-source`,
          target: tgtNode.id,
          targetHandle: `${tgtCol.id}-target`,
          type: 'crowsFoot',
          data: { cardinality: tgtCol.isUnique ? '1:1' : '1:n' },
          animated: true,
          style: { stroke: '#818cf8', strokeWidth: 2 },
        });
      }
    }
  }

  // 4. Tata letak otomatis: gunakan Dagre (Left-to-Right) jika ada relasi, atau Grid jika tanpa relasi
  if (edges.length > 0) {
    const laidOutNodes = computeDagreLayout(nodes, edges, 'LR');
    return { nodes: laidOutNodes, edges };
  }

  // Fallback Grid jika tidak ada relasi
  const totalTables = nodes.length;
  const numColumns = totalTables <= 4 ? 2 : totalTables <= 9 ? 3 : totalTables <= 16 ? 4 : 5;
  const columnHeights = new Array(numColumns).fill(60);

  nodes.forEach((node) => {
    let bestCol = 0;
    let minH = columnHeights[0];
    for (let c = 1; c < numColumns; c++) {
      if (columnHeights[c] < minH) {
        minH = columnHeights[c];
        bestCol = c;
      }
    }

    const x = 60 + bestCol * (NODE_WIDTH + H_GAP);
    const y = columnHeights[bestCol];
    node.position = { x, y };

    const estimatedHeight = 110 + node.data.columns.length * 34;
    columnHeights[bestCol] += estimatedHeight + V_GAP;
  });

  return { nodes, edges };
}

// Helper untuk memisahkan baris deklarasi kolom di dalam tabel dengan menghitung kedalaman tanda kurung
function splitStatements(content: string): string[] {
  const result: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;

    if (char === ',' && parenDepth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}
