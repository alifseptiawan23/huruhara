import type { Node, Edge } from '@xyflow/react';
import type { TableData } from '../types/schema';

export type SqlDialect = 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver' | 'oracle';
export type ExportFormat = SqlDialect | 'prisma' | 'drizzle' | 'markdown';

export interface DialectConfig {
  id: ExportFormat;
  label: string;
  badge: string;
  color: string;
  description: string;
  group: 'sql' | 'orm' | 'docs';
}

export const EXPORT_FORMATS: DialectConfig[] = [
  // SQL dialects
  { id: 'postgresql', label: 'PostgreSQL', badge: 'PG', color: '#336791', description: 'Standard PostgreSQL DDL', group: 'sql' },
  { id: 'mysql',      label: 'MySQL / MariaDB', badge: 'MY', color: '#00758f', description: 'MySQL dengan InnoDB & backtick', group: 'sql' },
  { id: 'sqlite',     label: 'SQLite', badge: 'SL', color: '#7ecde0', description: 'Ringan untuk mobile & embedded', group: 'sql' },
  { id: 'sqlserver',  label: 'SQL Server', badge: 'MS', color: '#c8441f', description: 'Microsoft SQL Server / Azure SQL', group: 'sql' },
  { id: 'oracle',     label: 'Oracle DB', badge: 'OR', color: '#f80000', description: 'Oracle Database enterprise syntax', group: 'sql' },
  // ORM schemas
  { id: 'prisma',  label: 'Prisma Schema', badge: '◆', color: '#5a67d8', description: 'schema.prisma untuk Prisma ORM', group: 'orm' },
  { id: 'drizzle', label: 'Drizzle ORM', badge: 'DZ', color: '#c3b15c', description: 'schema.ts untuk Drizzle ORM (TypeScript)', group: 'orm' },
  // Docs
  { id: 'markdown', label: 'Markdown Docs', badge: 'MD', color: '#475569', description: 'Data dictionary dalam format Markdown tabel', group: 'docs' },
];

// ─── Identifier quoting ───────────────────────────────────────────────────────
function q(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return `\`${name}\``;
  if (dialect === 'sqlserver') return `[${name}]`;
  return `"${name}"`;
}

// ─── Type mapping ─────────────────────────────────────────────────────────────
function mapType(raw: string, dialect: SqlDialect): string {
  const t = raw.toLowerCase();
  switch (dialect) {
    case 'mysql':
      return t.replace(/^bigint$/, 'BIGINT').replace(/^integer$/, 'INT')
        .replace(/^boolean$/, 'TINYINT(1)').replace(/^uuid$/, 'CHAR(36)')
        .replace(/^jsonb$/, 'JSON').replace(/^timestamptz$/, 'DATETIME')
        .replace(/^timestamp$/, 'DATETIME').replace(/^inet$/, 'VARCHAR(45)').toUpperCase();
    case 'sqlite':
      return t.replace(/^(bigint|integer|boolean)$/, 'INTEGER')
        .replace(/^(varchar\(.*?\)|text|uuid|inet)$/, 'TEXT')
        .replace(/^(decimal\(.*?\)|float)$/, 'REAL')
        .replace(/^(timestamp|timestamptz|date|time)$/, 'TEXT')
        .replace(/^jsonb$/, 'TEXT').toUpperCase();
    case 'sqlserver':
      return t.replace(/^bigint$/, 'BIGINT').replace(/^integer$/, 'INT')
        .replace(/^varchar\(255\)$/, 'NVARCHAR(255)').replace(/^text$/, 'NVARCHAR(MAX)')
        .replace(/^boolean$/, 'BIT').replace(/^uuid$/, 'UNIQUEIDENTIFIER')
        .replace(/^jsonb$/, 'NVARCHAR(MAX)').replace(/^(timestamp|timestamptz)$/, 'DATETIME2')
        .replace(/^inet$/, 'NVARCHAR(45)').toUpperCase();
    case 'oracle':
      return t.replace(/^bigint$/, 'NUMBER(19)').replace(/^integer$/, 'NUMBER(10)')
        .replace(/^varchar\((.*?)\)$/, 'VARCHAR2($1)').replace(/^text$/, 'CLOB')
        .replace(/^boolean$/, 'NUMBER(1)').replace(/^uuid$/, 'CHAR(36)')
        .replace(/^jsonb$/, 'CLOB').replace(/^(timestamp|timestamptz)$/, 'TIMESTAMP')
        .replace(/^inet$/, 'VARCHAR2(45)').toUpperCase();
    default: return raw.toUpperCase();
  }
}

// ─── PK auto-increment per dialect ───────────────────────────────────────────
function pkDef(colName: string, colType: string, dialect: SqlDialect): string {
  const qn = q(colName, dialect);
  const t = colType.toLowerCase();
  switch (dialect) {
    case 'postgresql':
      if (t === 'uuid') return `${qn} UUID DEFAULT gen_random_uuid() PRIMARY KEY`;
      if (t === 'bigint') return `${qn} BIGSERIAL PRIMARY KEY`;
      return `${qn} SERIAL PRIMARY KEY`;
    case 'mysql': return `${qn} ${mapType(colType, 'mysql')} AUTO_INCREMENT PRIMARY KEY`;
    case 'sqlite': return `${qn} INTEGER PRIMARY KEY AUTOINCREMENT`;
    case 'sqlserver': return `${qn} ${mapType(colType, 'sqlserver')} IDENTITY(1,1) PRIMARY KEY`;
    case 'oracle':  return `${qn} ${mapType(colType, 'oracle')} GENERATED ALWAYS AS IDENTITY PRIMARY KEY`;
    default: return `${qn} ${mapType(colType, dialect)} PRIMARY KEY`;
  }
}

// ─── SQL DDL Generator ────────────────────────────────────────────────────────
export function generateSql(nodes: Node<TableData>[], edges: Edge[], dialect: SqlDialect): string {
  const conf = EXPORT_FORMATS.find((d) => d.id === dialect)!;
  const sep = '─'.repeat(56);
  const header = `-- ${'═'.repeat(58)}\n-- DrawSQL Studio Export — ${conf.label}\n-- Tables: ${nodes.length} | Relations: ${edges.length}\n-- ${'═'.repeat(58)}\n`;
  const tableOutputs: string[] = [];

  for (const node of nodes) {
    const t = node.data;
    const lines: string[] = [];

    for (const col of t.columns) {
      if (col.isPrimaryKey) { lines.push(`  ${pkDef(col.name, col.type, dialect)}`); continue; }
      let def = `  ${q(col.name, dialect)} ${mapType(col.type, dialect)}`;
      if (!col.isNullable) def += ' NOT NULL';
      if (col.isUnique)    def += ' UNIQUE';
      lines.push(def);
    }

    const incoming = edges.filter((e) => e.target === node.id);
    if (incoming.length && dialect !== 'sqlite') {
      lines.push('');
      for (const edge of incoming) {
        const src = nodes.find((n) => n.id === edge.source);
        if (!src) continue;
        const srcCol = src.data.columns.find((c) => c.id === edge.sourceHandle?.replace('-source', ''));
        const tgtCol = t.columns.find((c) => c.id === edge.targetHandle?.replace('-target', ''));
        if (srcCol && tgtCol) {
          const fkName = `fk_${t.name}_${tgtCol.name}`;
          lines.push(
            `  CONSTRAINT ${dialect === 'oracle' ? fkName : q(fkName, dialect)} FOREIGN KEY (${q(tgtCol.name, dialect)}) REFERENCES ${q(src.data.name, dialect)} (${q(srcCol.name, dialect)}) ON DELETE CASCADE`
          );
        }
      }
    }

    let stmt = `-- ${sep}\n-- Table: ${t.name}\n-- ${sep}\n`;
    switch (dialect) {
      case 'mysql':
        stmt += `CREATE TABLE ${q(t.name, dialect)} (\n${lines.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
        break;
      case 'sqlserver':
        stmt += `CREATE TABLE ${q(t.name, dialect)} (\n${lines.join(',\n')}\n)\nGO`;
        break;
      default:
        stmt += `CREATE TABLE ${q(t.name, dialect)} (\n${lines.join(',\n')}\n);`;
    }
    tableOutputs.push(stmt);
  }

  return header + '\n' + tableOutputs.join('\n\n');
}

// ─── Prisma Schema Generator ──────────────────────────────────────────────────
export function generatePrisma(nodes: Node<TableData>[], edges: Edge[]): string {
  function prismaType(raw: string): string {
    const t = raw.toLowerCase();
    if (t === 'uuid') return 'String @db.Uuid';
    if (t === 'bigint') return 'BigInt';
    if (t === 'integer' || t === 'serial') return 'Int';
    if (t.startsWith('varchar')) return 'String';
    if (t === 'text') return 'String';
    if (t === 'boolean') return 'Boolean';
    if (t.includes('timestamp') || t === 'date') return 'DateTime';
    if (t.startsWith('decimal') || t.startsWith('numeric') || t === 'float') return 'Decimal';
    if (t === 'jsonb' || t === 'json') return 'Json';
    if (t === 'inet') return 'String';
    return 'String';
  }

  const lines: string[] = [
    'generator client {',
    '  provider = "prisma-client-js"',
    '}',
    '',
    'datasource db {',
    '  provider = "postgresql"',
    '  url      = env("DATABASE_URL")',
    '}',
    '',
  ];

  for (const node of nodes) {
    const t = node.data;
    const modelLines: string[] = [];

    for (const col of t.columns) {
      let def = `  ${col.name} ${prismaType(col.type)}`;
      if (col.isPrimaryKey && col.type.toLowerCase() === 'uuid') def += ' @id @default(uuid())';
      else if (col.isPrimaryKey) def += ' @id @default(autoincrement())';
      if (!col.isNullable && !col.isPrimaryKey) def += ''; // non-nullable is default in Prisma
      if (col.isNullable && !col.isPrimaryKey) def += '?';
      if (col.isUnique) def += ' @unique';
      modelLines.push(def);
    }

    // Add relation fields for FK edges
    const outgoing = edges.filter((e) => e.source === node.id);
    for (const edge of outgoing) {
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!tgt) continue;
      const tgtCol = tgt.data.columns.find((c) => c.id === edge.targetHandle?.replace('-target', ''));
      if (tgtCol) {
        modelLines.push(`  ${tgt.data.name}List ${tgt.data.name}[]`);
      }
    }

    const incoming = edges.filter((e) => e.target === node.id);
    for (const edge of incoming) {
      const src = nodes.find((n) => n.id === edge.source);
      if (!src) continue;
      const tgtCol = t.columns.find((c) => c.id === edge.targetHandle?.replace('-target', ''));
      const srcCol = src.data.columns.find((c) => c.id === edge.sourceHandle?.replace('-source', ''));
      if (tgtCol && srcCol) {
        modelLines.push(`  ${src.data.name} ${src.data.name} @relation(fields: [${tgtCol.name}], references: [${srcCol.name}])`);
      }
    }

    modelLines.push('');
    modelLines.push(`  @@map("${t.name}")`);

    lines.push(`model ${t.name.replace(/(^|_)(\w)/g, (_: string, _p1: string, p2: string) => p2.toUpperCase())} {`);
    lines.push(...modelLines);
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Drizzle ORM Generator ────────────────────────────────────────────────────
export function generateDrizzle(nodes: Node<TableData>[], _edges: Edge[]): string {
  function drizzleType(raw: string, isPk: boolean): string {
    const t = raw.toLowerCase();
    if (t === 'uuid') return isPk ? 'uuid("id").primaryKey().defaultRandom()' : 'uuid()';
    if (t === 'bigint') return isPk ? 'bigserial({ mode: "number" }).primaryKey()' : 'bigint({ mode: "number" })';
    if (t === 'integer') return isPk ? 'serial().primaryKey()' : 'integer()';
    if (t.startsWith('varchar')) {
      const len = t.match(/\((\d+)\)/)?.[1] ?? '255';
      return `varchar({ length: ${len} })`;
    }
    if (t === 'text') return 'text()';
    if (t === 'boolean') return 'boolean()';
    if (t === 'timestamp' || t === 'timestamptz') return 'timestamp({ withTimezone: true })';
    if (t === 'date') return 'date()';
    if (t.startsWith('decimal')) return 'decimal({ precision: 10, scale: 2 })';
    if (t === 'float') return 'doublePrecision()';
    if (t === 'jsonb') return 'jsonb()';
    if (t === 'inet') return 'varchar({ length: 45 })';
    return 'text()';
  }

  const tableImports = new Set(['pgTable']);
  const typeImports = new Set<string>();

  const tableBlocks: string[] = [];
  for (const node of nodes) {
    const t = node.data;
    const cols: string[] = [];
    for (const col of t.columns) {
      const drizzleDef = drizzleType(col.type, col.isPrimaryKey);
      let def = `  ${col.name}: ${drizzleDef}`;
      if (!col.isPrimaryKey) {
        if (!col.isNullable) def += '.notNull()';
        if (col.isUnique) def += '.unique()';
      }
      cols.push(`${def},`);

      // Collect imports
      if (drizzleDef.startsWith('uuid')) typeImports.add('uuid');
      else if (drizzleDef.startsWith('bigserial')) typeImports.add('bigserial');
      else if (drizzleDef.startsWith('bigint')) typeImports.add('bigint');
      else if (drizzleDef.startsWith('serial')) typeImports.add('serial');
      else if (drizzleDef.startsWith('integer')) typeImports.add('integer');
      else if (drizzleDef.startsWith('varchar')) typeImports.add('varchar');
      else if (drizzleDef.startsWith('text')) typeImports.add('text');
      else if (drizzleDef.startsWith('boolean')) typeImports.add('boolean');
      else if (drizzleDef.startsWith('timestamp')) typeImports.add('timestamp');
      else if (drizzleDef.startsWith('date')) typeImports.add('date');
      else if (drizzleDef.startsWith('decimal')) typeImports.add('decimal');
      else if (drizzleDef.startsWith('doublePrecision')) typeImports.add('doublePrecision');
      else if (drizzleDef.startsWith('jsonb')) typeImports.add('jsonb');
    }

    tableBlocks.push(
      `export const ${t.name} = pgTable("${t.name}", {\n${cols.join('\n')}\n});`
    );
  }

  const importLine = `import { ${[...tableImports, ...typeImports].join(', ')} } from "drizzle-orm/pg-core";`;

  return `// Generated by DrawSQL Studio\n// Drizzle ORM — PostgreSQL\n\n${importLine}\n\n${tableBlocks.join('\n\n')}`;
}

// ─── Markdown Data Dictionary ─────────────────────────────────────────────────
export function generateMarkdown(nodes: Node<TableData>[], edges: Edge[]): string {
  const lines: string[] = [
    '# 📊 Database Schema Documentation',
    '',
    `> Generated by **DrawSQL Studio** · ${nodes.length} tables · ${edges.length} relations`,
    '',
    '## Table of Contents',
    '',
  ];

  for (const node of nodes) {
    lines.push(`- [${node.data.name}](#${node.data.name.replace(/_/g, '-')})`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const node of nodes) {
    const t = node.data;
    lines.push(`## ${t.name}`);
    lines.push('');
    lines.push('| Column | Type | Nullable | Key | Notes |');
    lines.push('| :----- | :--- | :------: | :-: | :---- |');

    for (const col of t.columns) {
      const nullable = col.isNullable ? '✓' : '✗';
      const key = col.isPrimaryKey ? '🔑 PK' : col.isUnique ? '🔗 UQ' : '';
      const fkEdge = edges.find(
        (e) => e.target === node.id && e.targetHandle === `${col.id}-target`
      );
      const fkNote = fkEdge
        ? `FK → \`${nodes.find((n) => n.id === fkEdge.source)?.data.name ?? '?'}\``
        : col.comment ?? '';
      lines.push(`| \`${col.name}\` | \`${col.type}\` | ${nullable} | ${key} | ${fkNote} |`);
    }

    lines.push('');
    // Relations
    const outgoing = edges.filter((e) => e.source === node.id);
    if (outgoing.length) {
      lines.push('**Relations:**');
      for (const edge of outgoing) {
        const tgt = nodes.find((n) => n.id === edge.target);
        const srcCol = t.columns.find((c) => c.id === edge.sourceHandle?.replace('-source', ''));
        const tgtCol = tgt?.data.columns.find((c) => c.id === edge.targetHandle?.replace('-target', ''));
        if (tgt && srcCol && tgtCol) {
          lines.push(`- \`${t.name}.${srcCol.name}\` → \`${tgt.data.name}.${tgtCol.name}\` (one-to-many)`);
        }
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
