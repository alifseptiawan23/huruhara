export type DataType =
  | 'bigint' | 'integer' | 'varchar(255)' | 'text'
  | 'boolean' | 'timestamp' | 'timestamptz' | 'date' | 'time'
  | 'uuid' | 'jsonb' | 'decimal(10,2)' | 'float' | 'inet';

export interface Column {
  id: string;
  name: string;
  type: DataType | string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface TableData extends Record<string, unknown> {
  id: string;
  name: string;
  color: string;
  columns: Column[];
  comment?: string;
}

export interface Sheet {
  id: string;
  name: string;
  nodes: import('@xyflow/react').Node<TableData>[];
  edges: import('@xyflow/react').Edge[];
  viewport?: { x: number; y: number; zoom: number };
  projectSettings?: {
    defaultRole?: 'editor' | 'viewer';
    allowedEditors?: string[];
    ownerId?: string;
    ownerName?: string;
    ownerEmail?: string;
    updatedAt?: string;
  };
}

export type Cardinality = '1:1' | '1:n' | 'n:1' | 'n:m' | 'one-to-one' | 'one-to-many' | 'many-to-many';
